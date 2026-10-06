"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { sharedExpenses, type SplitParticipant } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { requireCoreAccess } from "@/lib/entitlements";
import { getDefaultAccountId } from "@/lib/account";
import { bookSettlementExpense } from "@/lib/transactions/settlement";
import { deleteTransactionUnchecked } from "@/lib/transactions/delete-row";
import { fail, isFail } from "@/lib/action-result";

function revalidateSharedPaths() {
  revalidatePath("/shared");
}

// Optimistic-concurrency predicate: matches the row only if its participants
// are still exactly what this request read. A settle writes the reimbursement
// transaction first (money-before-flag ordering) and only then flips the
// participant — without this, a double-tapped 結清 (or two devices) would both
// see "unsettled", both create a reimbursement, and double-count the money.
function participantsUnchanged(participants: SplitParticipant[]) {
  return sql`${sharedExpenses.participants} = ${JSON.stringify(participants)}::jsonb`;
}

const CONCURRENT_UPDATE_MESSAGE = "這筆分帳剛剛已被更新，請重新整理後再試";

// Settling records the money that actually changed hands as a real personal
// transaction, in the split event's own category (see
// lib/transactions/settlement.ts): "I owe them" → an expense (my real
// spend), "they owe me" → a refund (negative expense) against the category I
// originally fronted the whole bill in. Without this, personal stats would
// keep showing the split as outstanding forever.
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
    // default account.
    accountId?: string;
  },
) {
  return bookSettlementExpense(userId, {
    expenseAmount: input.iOwe ? Number(input.amount) : -Number(input.amount),
    categoryId: input.categoryId,
    note: `分帳結算：${input.label}`,
    accountId: input.accountId,
    linkedTransactionId: input.linkedTransactionId,
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
  // Creating/editing split records is core-unlock; settling, un-settling
  // and deleting existing ones are deliberately left ungated so a lapsed
  // trial never strands data the user already entered.
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

  const updated = await db
    .update(sharedExpenses)
    .set({ participants: nextParticipants })
    .where(
      and(
        eq(sharedExpenses.id, sharedExpenseId),
        eq(sharedExpenses.userId, userId),
        participantsUnchanged(row.participants),
      ),
    )
    .returning({ id: sharedExpenses.id });
  if (updated.length === 0) {
    // Lost the race — another request already changed this event. Undo the
    // reimbursement this call just created so it isn't double-counted.
    await deleteTransactionUnchecked(userId, settlement.id);
    revalidateSharedPaths();
    return fail(CONCURRENT_UPDATE_MESSAGE);
  }

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

  // One settlement transaction per category, not one uncategorized lump:
  // within a category, what I owed them is my spend and what they owed me
  // is a refund of my spend, so they net (signed expense, see
  // createSettlementTransaction). The account still moves by exactly the
  // overall net — it's just split across the categories it belongs to, so
  // e.g. a movie I owed them for still shows up as 娛樂 spending instead of
  // vanishing into a netted "income".
  const resolvedAccountId = accountId ?? (await getDefaultAccountId(userId));
  const byCategory = new Map<string, { categoryId: string | null; expenseAmount: number; count: number }>();
  for (const t of targets) {
    const key = t.row.categoryId ?? "none";
    const entry = byCategory.get(key) ?? { categoryId: t.row.categoryId, expenseAmount: 0, count: 0 };
    entry.expenseAmount += t.p.iOwe ? Number(t.p.amount) : -Number(t.p.amount);
    entry.count++;
    byCategory.set(key, entry);
  }
  const txIdByCategory = new Map<string, string>();
  for (const [key, entry] of byCategory) {
    if (Math.abs(entry.expenseAmount) < 0.005) continue;
    const settlement = await bookSettlementExpense(userId, {
      expenseAmount: entry.expenseAmount,
      categoryId: entry.categoryId,
      note: `分帳一鍵結清（${name}，共 ${entry.count} 筆）`,
      accountId: resolvedAccountId,
    });
    if (isFail(settlement)) {
      for (const id of txIdByCategory.values()) await deleteTransactionUnchecked(userId, id);
      return settlement;
    }
    txIdByCategory.set(key, settlement.id);
  }
  const txIdFor = (row: (typeof targets)[number]["row"]) => txIdByCategory.get(row.categoryId ?? "none") ?? null;

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

  const planned = Array.from(byRow.values()).map(({ row, indices }) => ({
    row,
    nextParticipants: row.participants.map((p, i) =>
      indices.has(i)
        ? { ...p, isSettled: true, settledAt, settlementTransactionId: txIdFor(row), settlementBatchId }
        : p,
    ),
  }));

  // One atomic batch, each update guarded on the row still matching what was
  // read above (see participantsUnchanged). A guard that misses doesn't abort
  // the batch — it just updates 0 rows — so check afterwards and roll the
  // whole thing back if any row moved underneath us.
  const [firstUpdate, ...restUpdates] = planned.map(({ row, nextParticipants }) =>
    db
      .update(sharedExpenses)
      .set({ participants: nextParticipants })
      .where(
        and(
          eq(sharedExpenses.id, row.id),
          eq(sharedExpenses.userId, userId),
          participantsUnchanged(row.participants),
        ),
      )
      .returning({ id: sharedExpenses.id }),
  );
  const results = await db.batch([firstUpdate, ...restUpdates]);

  if (results.some((r) => r.length === 0)) {
    const reverts = planned
      .filter((_, i) => results[i].length > 0)
      .map(({ row, nextParticipants }) =>
        db
          .update(sharedExpenses)
          .set({ participants: row.participants })
          .where(
            and(
              eq(sharedExpenses.id, row.id),
              eq(sharedExpenses.userId, userId),
              participantsUnchanged(nextParticipants),
            ),
          ),
      );
    if (reverts.length > 0) {
      const [firstRevert, ...restReverts] = reverts;
      await db.batch([firstRevert, ...restReverts]);
    }
    for (const id of txIdByCategory.values()) await deleteTransactionUnchecked(userId, id);
    revalidateSharedPaths();
    return fail(CONCURRENT_UPDATE_MESSAGE);
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

  const [row] = await db
    .select()
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, sharedExpenseId), eq(sharedExpenses.userId, userId)));
  if (!row) return;
  const participant = row.participants[participantIndex];
  if (!participant || !participant.isSettled) return;

  const batchId = participant.settlementBatchId;

  // If this was part of a batch, every row's matching participants need the
  // same revert — refetch everything for this user so a batch spanning
  // multiple rows is reverted together, not just this one row.
  const allRows = batchId
    ? await db.select().from(sharedExpenses).where(eq(sharedExpenses.userId, userId))
    : [row];

  // A batch books one settlement transaction per category (see
  // settleAllForName), so its participants can point at several — remove
  // every one of them, not just the tapped participant's.
  const txIds = new Set<string>();
  if (participant.settlementTransactionId) txIds.add(participant.settlementTransactionId);
  if (batchId) {
    for (const r of allRows) {
      for (const p of r.participants) {
        if (p.settlementBatchId === batchId && p.settlementTransactionId) txIds.add(p.settlementTransactionId);
      }
    }
  }
  for (const id of txIds) await deleteTransactionUnchecked(userId, id);

  // Counted so the UI can tell the user a whole batch came back, not just
  // the one row they tapped.
  let reverted = 0;
  for (const r of allRows) {
    let changed = false;
    const nextParticipants = r.participants.map((p) => {
      const matches = batchId ? p.settlementBatchId === batchId : r.id === row.id && p === participant;
      if (!matches) return p;
      changed = true;
      reverted++;
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
  return { reverted };
}

// Deleting a split with any settled participant would erase the audit trail
// while the real reimbursement transaction(s) it produced stay behind
// unexplained — same rationale as the edit block above. Only for standalone
// (unlinked) splits; a linked one is removed by deleting its transaction
// (see transactions/actions.ts), which cascades to this row.
export async function deleteSplitExpense(sharedExpenseId: string) {
  const userId = await requireUserId();

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
