"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { sharedExpenses, transactions, type SplitParticipant } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { requireCoreAccess } from "@/lib/entitlements";
import { getDefaultAccountId } from "@/lib/account";
import { todayInTaipeiString } from "@/lib/date";
import { computeNetBalance } from "@/lib/shared-balance";
import { createTransaction, deleteSettlementTransaction } from "@/app/(app)/transactions/actions";
import { fail, isFail } from "@/lib/action-result";

function revalidateSharedPaths() {
  revalidatePath("/shared");
}

// Settling records the other side's reimbursement as a real personal
// transaction — a settled "they owe me" participant means they paid me back
// (income), a settled "I owe them" participant means I paid my share to them
// (expense). Without this, personal stats would keep showing the split as
// outstanding forever, even after the money actually changed hands.
async function createSettlementTransaction(
  userId: string,
  input: {
    amount: string;
    iOwe: boolean;
    categoryId: string | null;
    label: string;
    linkedTransactionId: string | null;
    sharedExpenseId: string;
    // User-chosen override from the 結清 button's account picker — lets them
    // represent which account actually paid/received the money instead of
    // always falling back to the linked transaction's account or the
    // default account below.
    accountId?: string;
  },
) {
  let accountId = input.accountId;
  if (!accountId && input.linkedTransactionId) {
    const [linked] = await db
      .select({ accountId: transactions.accountId })
      .from(transactions)
      .where(and(eq(transactions.id, input.linkedTransactionId), eq(transactions.userId, userId)));
    accountId = linked?.accountId;
  }
  if (!accountId) accountId = await getDefaultAccountId(userId);

  return createTransaction({
    categoryId: input.categoryId ?? undefined,
    type: input.iOwe ? "expense" : "income",
    amount: Number(input.amount),
    accountId,
    note: `分帳結算：${input.label}`,
    occurredAt: todayInTaipeiString(),
    linkedSharedExpenseId: input.sharedExpenseId,
  });
}

const participantInputSchema = z.object({
  name: z.string().min(1).max(30),
  amount: z.coerce.number().positive(),
  iOwe: z.boolean(),
});

const splitExpenseInputSchema = z.object({
  name: z.string().min(1).max(50),
  categoryId: z.string().uuid().optional(),
  occurredAt: z.string().min(1),
  participants: z.array(participantInputSchema).min(1).max(20),
});

function toParticipantRows(input: z.infer<typeof participantInputSchema>[]): SplitParticipant[] {
  return input.map((p) => ({
    name: p.name.trim(),
    amount: p.amount.toString(),
    iOwe: p.iOwe,
    isSettled: false,
    settledAt: null,
    settlementTransactionId: null,
    settlementBatchId: null,
  }));
}

// Standalone split (no linked personal transaction) — used by the /shared
// page's manual "新增分帳支出" dialog and its AI quick-add. A transaction-
// entry-flow split (the common "I paid, N friends owe me" case) is created
// directly in transactions/actions.ts's createTransaction instead, since it
// also has to insert the real transaction + balance update atomically.
export async function createSplitExpense(input: {
  name: string;
  categoryId?: string;
  occurredAt: string;
  participants: { name: string; amount: number; iOwe: boolean }[];
}) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");
  const parsed = splitExpenseInputSchema.parse(input);

  const [row] = await db
    .insert(sharedExpenses)
    .values({
      userId,
      categoryId: parsed.categoryId,
      name: parsed.name,
      occurredAt: parsed.occurredAt,
      participants: toParticipantRows(parsed.participants),
    })
    .returning({ id: sharedExpenses.id });

  revalidateSharedPaths();
  return { id: row.id };
}

const updateSplitExpenseSchema = splitExpenseInputSchema.extend({
  id: z.string().uuid(),
});

// Only a split with no settled participants can be edited — a settled
// participant already has a reimbursement transaction recorded against its
// original amount, and changing the numbers afterward would silently desync
// the two (same rule as the old single-counterparty version).
export async function updateSplitExpense(input: {
  id: string;
  name: string;
  categoryId?: string;
  occurredAt: string;
  participants: { name: string; amount: number; iOwe: boolean }[];
}) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");
  const parsed = updateSplitExpenseSchema.parse(input);

  const [existing] = await db
    .select({ participants: sharedExpenses.participants })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, parsed.id), eq(sharedExpenses.userId, userId)));
  if (!existing) return fail("找不到指定的分帳支出");
  if (existing.participants.some((p) => p.isSettled)) return fail("已有對象結清的項目無法編輯");

  await db
    .update(sharedExpenses)
    .set({
      name: parsed.name,
      categoryId: parsed.categoryId ?? null,
      occurredAt: parsed.occurredAt,
      participants: toParticipantRows(parsed.participants),
    })
    .where(and(eq(sharedExpenses.id, parsed.id), eq(sharedExpenses.userId, userId)));

  revalidateSharedPaths();
}

export async function settleParticipant(sharedExpenseId: string, participantIndex: number, accountId?: string) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");

  const [row] = await db
    .select()
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, sharedExpenseId), eq(sharedExpenses.userId, userId)));
  if (!row) return fail("找不到指定的分帳項目");
  const participant = row.participants[participantIndex];
  if (!participant || participant.isSettled) return;

  // Record the reimbursement first — if it fails (e.g. an FX lookup fails
  // for a foreign-currency account), the participant stays unsettled instead
  // of silently losing the money it was supposed to represent.
  const settlement = await createSettlementTransaction(userId, {
    amount: participant.amount,
    iOwe: participant.iOwe,
    categoryId: row.categoryId,
    label: `${row.name}（${participant.name}）`,
    linkedTransactionId: row.linkedTransactionId,
    sharedExpenseId: row.id,
    accountId,
  });
  if (isFail(settlement)) return settlement;

  const nextParticipants = [...row.participants];
  nextParticipants[participantIndex] = {
    ...participant,
    isSettled: true,
    settledAt: new Date().toISOString(),
    settlementTransactionId: settlement.id,
  };

  await db
    .update(sharedExpenses)
    .set({ participants: nextParticipants })
    .where(and(eq(sharedExpenses.id, sharedExpenseId), eq(sharedExpenses.userId, userId)));

  revalidateSharedPaths();
}

// Settles every still-unsettled participant of ONE split event — the
// /shared page's per-event "一次結清全部" button (依事件 view). Deliberately
// calls settleParticipant once per person instead of netting everyone into
// a single transaction the way settleAllForName below does: different
// participants within one event are independent, real money flows
// (different people, possibly paying back on different days), and merging
// them would lose exactly the per-person traceability the 依事件 view is
// built to keep. A multi-person event settled this way naturally produces
// one transaction per person, all created together — which is exactly the
// scenario the transaction-list settlement grouping (groupSettlements)
// exists to collapse back into one display row.
export async function settleAllParticipantsInEvent(sharedExpenseId: string, accountId?: string) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");

  const [row] = await db
    .select()
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, sharedExpenseId), eq(sharedExpenses.userId, userId)));
  if (!row) return fail("找不到指定的分帳項目");

  const unsettledIndexes = row.participants
    .map((p, i) => (p.isSettled ? -1 : i))
    .filter((i) => i >= 0);
  if (unsettledIndexes.length === 0) return { succeeded: 0 };

  let succeeded = 0;
  const errors: string[] = [];
  for (const index of unsettledIndexes) {
    const result = await settleParticipant(sharedExpenseId, index, accountId);
    if (isFail(result)) errors.push(`${row.participants[index].name}：${result.error}`);
    else succeeded++;
  }

  if (errors.length > 0) return fail(`已結清 ${succeeded} 人，${errors.length} 人失敗（${errors.join("；")}）`);
  return { succeeded };
}

// Bulk-settles every unsettled participant across every split event that
// matches `name`, netted into a single reimbursement transaction instead of
// one per item — the /shared page's 依對象 view, for a long-running fixed
// counterparty (e.g. a couple who record everything under one account and
// settle once a month) where dozens/hundreds of small per-event IOUs get
// paid back as one real lump sum, not individually on different days. This
// is the opposite tradeoff from settleAllParticipantsInEvent above: there,
// different participants are genuinely independent real payments and must
// stay separate transactions; here, it's always the SAME two people
// settling everything together in one real moment, so netting to one
// transaction is the accurate representation, not a loss of traceability.
export async function settleAllForName(
  name: string,
  range?: { from?: string; to?: string },
  accountId?: string,
) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");

  const conditions = [eq(sharedExpenses.userId, userId)];
  if (range?.from) conditions.push(gte(sharedExpenses.occurredAt, range.from));
  if (range?.to) conditions.push(lte(sharedExpenses.occurredAt, range.to));

  const rows = await db
    .select()
    .from(sharedExpenses)
    .where(and(...conditions));

  const targets = rows.flatMap((row) =>
    row.participants
      .map((p, participantIndex) => ({ row, p, participantIndex }))
      .filter(({ p }) => p.name === name && !p.isSettled),
  );
  if (targets.length === 0) return;

  const net = computeNetBalance(targets.map((t) => t.p));
  let settlementTransactionId: string | null = null;
  if (Math.abs(net) >= 1) {
    const resolvedAccountId = accountId ?? (await getDefaultAccountId(userId));
    const settlement = await createTransaction({
      type: net > 0 ? "income" : "expense",
      amount: Math.abs(net),
      accountId: resolvedAccountId,
      note: `分帳一鍵結清（${name}，共 ${targets.length} 筆）`,
      occurredAt: todayInTaipeiString(),
    });
    if (isFail(settlement)) return settlement;
    settlementTransactionId = settlement.id;
  }

  const settlementBatchId = crypto.randomUUID();
  const settledAt = new Date().toISOString();

  // Group targets back by their source row so each row is updated once with
  // all of its affected participants, instead of racing multiple updates
  // against the same row.
  const byRow = new Map<string, { row: (typeof targets)[number]["row"]; indices: Set<number> }>();
  for (const t of targets) {
    const entry = byRow.get(t.row.id) ?? { row: t.row, indices: new Set<number>() };
    entry.indices.add(t.participantIndex);
    byRow.set(t.row.id, entry);
  }

  for (const { row, indices } of byRow.values()) {
    const nextParticipants = row.participants.map((p, i) =>
      indices.has(i) ? { ...p, isSettled: true, settledAt, settlementTransactionId, settlementBatchId } : p,
    );
    await db
      .update(sharedExpenses)
      .set({ participants: nextParticipants })
      .where(and(eq(sharedExpenses.id, row.id), eq(sharedExpenses.userId, userId)));
  }

  revalidateSharedPaths();
}

// Reverts a mistaken settle — removes the reimbursement transaction it
// produced (reversing its balance effect) and puts the participant back to
// unsettled. A non-null settlementBatchId comes from settleAllForName above
// (or from historical data written before this app's 依事件 redesign) —
// every participant in the same call shares one net transaction that can't
// be split back out per person, so reverting any one of them reverts the
// whole batch together.
export async function unsettleParticipant(sharedExpenseId: string, participantIndex: number) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");

  const [row] = await db
    .select()
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, sharedExpenseId), eq(sharedExpenses.userId, userId)));
  if (!row) return;
  const participant = row.participants[participantIndex];
  if (!participant || !participant.isSettled) return;

  if (participant.settlementTransactionId) {
    await deleteSettlementTransaction(participant.settlementTransactionId);
  }

  const batchId = participant.settlementBatchId;

  // If this was part of a batch, every row's matching participants need the
  // same revert — refetch everything for this user so a batch spanning
  // multiple rows is reverted together, not just this one row.
  const allRows = batchId
    ? await db.select().from(sharedExpenses).where(eq(sharedExpenses.userId, userId))
    : [row];

  for (const r of allRows) {
    let changed = false;
    const nextParticipants = r.participants.map((p) => {
      const matches = batchId ? p.settlementBatchId === batchId : r.id === row.id && p === participant;
      if (!matches) return p;
      changed = true;
      return { ...p, isSettled: false, settledAt: null, settlementTransactionId: null, settlementBatchId: null };
    });
    if (changed) {
      await db
        .update(sharedExpenses)
        .set({ participants: nextParticipants })
        .where(and(eq(sharedExpenses.id, r.id), eq(sharedExpenses.userId, userId)));
    }
  }

  revalidateSharedPaths();
}

// Deleting a split with any settled participant would erase the audit trail
// while the real reimbursement transaction(s) it produced stay behind
// unexplained — same rationale as the edit block above. Only for standalone
// (unlinked) splits; a linked one is removed by deleting its transaction
// (see transactions/actions.ts), which cascades to this row.
export async function deleteSplitExpense(sharedExpenseId: string) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");

  const [existing] = await db
    .select({ participants: sharedExpenses.participants })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, sharedExpenseId), eq(sharedExpenses.userId, userId)));
  if (!existing) return;
  if (existing.participants.some((p) => p.isSettled)) return fail("已有對象結清的項目無法刪除");

  await db
    .delete(sharedExpenses)
    .where(and(eq(sharedExpenses.id, sharedExpenseId), eq(sharedExpenses.userId, userId)));

  revalidateSharedPaths();
}
