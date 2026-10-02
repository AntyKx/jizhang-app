import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { getDefaultAccountId } from "@/lib/account";
import { ownedCategoryId } from "@/lib/category";
import { getExchangeRateToTwd } from "@/lib/fx";
import { todayInTaipeiString } from "@/lib/date";
import { fail, type Fail } from "@/lib/action-result";
import { revalidateTransactionPaths } from "@/lib/transactions/delete-row";

// How a split settlement lands in the personal ledger. Always an *expense*
// in the split event's own category:
//   - I owed them and paid them → positive expense (my real spend).
//   - They owed me and paid me back → NEGATIVE expense, i.e. a refund
//     against the category I originally spent in.
// The refund used to be booked as income with an expense category, which
// left the original category over-stated (the full bill I fronted) and
// inflated income by money that was only ever my own coming back.
//
// Server-only, outside any "use server" file: createTransaction's schema
// rejects negative amounts on purpose (user input), so this is the one
// sanctioned path that writes them.
export async function bookSettlementExpense(
  userId: string,
  input: {
    // Signed: positive = money out (I paid), negative = money back to me.
    expenseAmount: number;
    categoryId: string | null;
    note: string;
    accountId?: string;
    // Falls back to this transaction's account when no accountId is given.
    linkedTransactionId?: string | null;
    linkedSharedExpenseId?: string;
  },
): Promise<{ id: string } | Fail> {
  let accountId = input.accountId;
  if (!accountId && input.linkedTransactionId) {
    const [linked] = await db
      .select({ accountId: transactions.accountId })
      .from(transactions)
      .where(and(eq(transactions.id, input.linkedTransactionId), eq(transactions.userId, userId)));
    accountId = linked?.accountId;
  }
  if (!accountId) accountId = await getDefaultAccountId(userId);

  const [account] = await db
    .select({ currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!account) return fail("找不到指定的帳戶");

  const occurredAt = todayInTaipeiString();
  let exchangeRate: number;
  try {
    exchangeRate = await getExchangeRateToTwd(account.currency, occurredAt);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "無法取得匯率，請稍後再試");
  }

  const id = crypto.randomUUID();
  const amount = Math.round(input.expenseAmount * 100) / 100;
  await db.batch([
    db.insert(transactions).values({
      id,
      userId,
      accountId,
      categoryId: await ownedCategoryId(userId, input.categoryId),
      type: "expense",
      amount: amount.toString(),
      exchangeRate: exchangeRate.toString(),
      note: input.note,
      occurredAt,
      linkedSharedExpenseId: input.linkedSharedExpenseId,
    }),
    db
      .update(accounts)
      .set({ currentBalance: sql`${accounts.currentBalance} - ${amount}` })
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId))),
  ]);

  revalidateTransactionPaths();
  return { id };
}
