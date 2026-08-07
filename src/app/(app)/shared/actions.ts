"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { sharedExpenses, transactions, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { requireCoreAccess } from "@/lib/entitlements";
import { getDefaultAccountId } from "@/lib/account";
import { todayInTaipeiString } from "@/lib/date";
import { computeNetBalance } from "@/lib/shared-balance";
import { createTransaction } from "@/app/(app)/transactions/actions";

function revalidateSharedPaths() {
  revalidatePath("/shared");
}

type SettleableExpense = {
  amount: string;
  paidByMe: boolean;
  categoryId: string | null;
  name: string;
  linkedTransactionId: string | null;
};

// Settling records the other half's reimbursement as a real personal
// transaction — a settled "I paid" expense means the partner paid me back
// (income), a settled "partner paid" expense means I paid my share back to
// them (expense). Without this, personal stats would keep showing the full
// original amount forever, even after the money actually changed hands.
async function createSettlementTransaction(userId: string, expense: SettleableExpense) {
  const half = Number(expense.amount) / 2;

  let accountId: string | undefined;
  if (expense.linkedTransactionId) {
    const [linked] = await db
      .select({ accountId: transactions.accountId })
      .from(transactions)
      .where(and(eq(transactions.id, expense.linkedTransactionId), eq(transactions.userId, userId)));
    accountId = linked?.accountId;
  }
  if (!accountId) accountId = await getDefaultAccountId(userId);

  await createTransaction({
    categoryId: expense.categoryId ?? undefined,
    type: expense.paidByMe ? "income" : "expense",
    amount: half,
    accountId,
    note: `分帳結算：${expense.name}`,
    occurredAt: todayInTaipeiString(),
  });
}

const sharedExpenseInputSchema = z.object({
  name: z.string().min(1).max(50),
  amount: z.coerce.number().positive(),
  paidByMe: z.boolean(),
  categoryId: z.string().uuid().optional(),
  occurredAt: z.string().min(1),
});

async function insertParsedSharedExpense(userId: string, parsed: z.infer<typeof sharedExpenseInputSchema>) {
  await db.insert(sharedExpenses).values({
    userId,
    paidByMe: parsed.paidByMe,
    categoryId: parsed.categoryId,
    name: parsed.name,
    amount: parsed.amount.toString(),
    occurredAt: parsed.occurredAt,
  });

  revalidateSharedPaths();
}

export async function createSharedExpense(formData: FormData) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");
  const categoryIdRaw = formData.get("categoryId");
  const parsed = sharedExpenseInputSchema.parse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    paidByMe: formData.get("paidByMe") === "true",
    categoryId: categoryIdRaw ? String(categoryIdRaw) : undefined,
    occurredAt: formData.get("occurredAt"),
  });

  await insertParsedSharedExpense(userId, parsed);
}

// Used by the AI quick-add flow, which already has a parsed draft object
// rather than a <form>'s FormData.
export async function createSharedExpenseFromDraft(input: {
  name: string;
  amount: number;
  paidByMe: boolean;
  categoryId?: string;
  occurredAt: string;
}) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");
  const parsed = sharedExpenseInputSchema.parse(input);
  await insertParsedSharedExpense(userId, parsed);
}

const updateSharedExpenseSchema = sharedExpenseInputSchema.extend({
  id: z.string().uuid(),
});

// Only unsettled expenses can be edited — a settled one already has a
// reimbursement transaction recorded against its original amount/payer, and
// changing those numbers afterward would silently desync the two.
export async function updateSharedExpense(input: {
  id: string;
  name: string;
  amount: number;
  paidByMe: boolean;
  categoryId?: string;
  occurredAt: string;
}) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");
  const parsed = updateSharedExpenseSchema.parse(input);

  const [existing] = await db
    .select({ isSettled: sharedExpenses.isSettled })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, parsed.id), eq(sharedExpenses.userId, userId)));
  if (!existing) throw new Error("找不到指定的分帳支出");
  if (existing.isSettled) throw new Error("已結清的項目無法編輯");

  await db
    .update(sharedExpenses)
    .set({
      name: parsed.name,
      amount: parsed.amount.toString(),
      paidByMe: parsed.paidByMe,
      categoryId: parsed.categoryId ?? null,
      occurredAt: parsed.occurredAt,
    })
    .where(and(eq(sharedExpenses.id, parsed.id), eq(sharedExpenses.userId, userId)));

  revalidateSharedPaths();
}

export async function settleSharedExpense(expenseId: string) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");

  const [expense] = await db
    .select()
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, expenseId), eq(sharedExpenses.userId, userId)));
  if (!expense || expense.isSettled) return;

  // Record the reimbursement first — if it throws (e.g. an FX lookup fails
  // for a foreign-currency account), the expense stays unsettled instead of
  // silently losing the money it was supposed to represent.
  await createSettlementTransaction(userId, expense);

  await db
    .update(sharedExpenses)
    .set({ isSettled: true, settledAt: new Date() })
    .where(and(eq(sharedExpenses.id, expenseId), eq(sharedExpenses.userId, userId)));

  revalidateSharedPaths();
}

// Bulk settle nets everything into a single reimbursement transaction
// instead of one per expense — individual settle (above) still records one
// transaction per item, since there's exactly one thing being settled.
// Accepts an optional date range so a specific stretch (e.g. "just July")
// can be settled without touching older unsettled items outside it.
export async function settleAllSharedExpenses(range?: { from?: string; to?: string }) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");

  const conditions = [eq(sharedExpenses.userId, userId), eq(sharedExpenses.isSettled, false)];
  if (range?.from) conditions.push(gte(sharedExpenses.occurredAt, range.from));
  if (range?.to) conditions.push(lte(sharedExpenses.occurredAt, range.to));

  const unsettled = await db
    .select()
    .from(sharedExpenses)
    .where(and(...conditions));
  if (unsettled.length === 0) return;

  // Same ordering fix as settleSharedExpense: record the net reimbursement
  // first, only mark everything settled once that succeeds.
  const net = computeNetBalance(unsettled);
  if (Math.abs(net) >= 1) {
    const accountId = await getDefaultAccountId(userId);
    await createTransaction({
      type: net > 0 ? "income" : "expense",
      amount: Math.abs(net),
      accountId,
      note: `分帳一鍵結清（共 ${unsettled.length} 筆）`,
      occurredAt: todayInTaipeiString(),
    });
  }

  await db
    .update(sharedExpenses)
    .set({ isSettled: true, settledAt: new Date() })
    .where(and(...conditions));

  revalidateSharedPaths();
}

// Deleting a settled expense would erase the audit trail while the real
// reimbursement transaction it produced (see settleSharedExpense) stays
// behind unexplained — same rationale as the edit block above.
export async function deleteSharedExpense(expenseId: string) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");

  const [existing] = await db
    .select({ isSettled: sharedExpenses.isSettled })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.id, expenseId), eq(sharedExpenses.userId, userId)));
  if (!existing) return;
  if (existing.isSettled) throw new Error("已結清的項目無法刪除");

  await db
    .delete(sharedExpenses)
    .where(and(eq(sharedExpenses.id, expenseId), eq(sharedExpenses.userId, userId)));

  revalidateSharedPaths();
}

export async function updatePartnerName(name: string) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");
  const trimmed = name.trim().slice(0, 30);

  await db
    .insert(userSettings)
    .values({ userId, partnerName: trimmed || null })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { partnerName: trimmed || null },
    });

  revalidateSharedPaths();
}
