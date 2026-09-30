import "server-only";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sharedExpenses, transactions } from "@/db/schema";

// Lives outside any "use server" file on purpose: everything exported from
// one of those becomes a client-callable server action, and these helpers
// skip every guard deleteTransaction/updateTransaction apply. Only the
// actions that are themselves the sanctioned way to remove a transaction
// they created (reverting a settlement, undoing a just-posted recurring
// occurrence) may call them.

export function revalidateTransactionPaths() {
  revalidatePath("/record");
  revalidatePath("/calendar");
  revalidatePath("/stats");
  revalidatePath("/transactions");
  revalidatePath("/shared");
  revalidatePath("/accounts");
}

// Deletes a transaction row and reverses its balance effect, atomically.
export async function deleteTransactionRow(userId: string, tx: typeof transactions.$inferSelect) {
  const deleteTx = db
    .delete(transactions)
    .where(and(eq(transactions.id, tx.id), eq(transactions.userId, userId)));

  if (tx.type === "transfer") {
    // Undo both legs: give the amount (+ any fee, which only ever left the
    // source account) back to the source account, and take the amount back
    // out of the destination account.
    const refundToSource = Number(tx.amount) + Number(tx.feeAmount);
    if (tx.toAccountId) {
      await db.batch([
        deleteTx,
        db
          .update(accounts)
          .set({ currentBalance: sql`${accounts.currentBalance} + ${refundToSource}` })
          .where(and(eq(accounts.id, tx.accountId), eq(accounts.userId, userId))),
        db
          .update(accounts)
          .set({ currentBalance: sql`${accounts.currentBalance} - ${tx.amount}` })
          .where(and(eq(accounts.id, tx.toAccountId), eq(accounts.userId, userId))),
      ]);
    } else {
      await db.batch([
        deleteTx,
        db
          .update(accounts)
          .set({ currentBalance: sql`${accounts.currentBalance} + ${refundToSource}` })
          .where(and(eq(accounts.id, tx.accountId), eq(accounts.userId, userId))),
      ]);
    }
  } else {
    const delta = tx.type === "expense" ? Number(tx.amount) : -Number(tx.amount);
    await db.batch([
      deleteTx,
      db
        .update(accounts)
        .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
        .where(and(eq(accounts.id, tx.accountId), eq(accounts.userId, userId))),
    ]);
  }
}

// Same as deleteTransactionRow, looked up by id. No-op if it's not this
// user's (or already gone).
export async function deleteTransactionUnchecked(userId: string, transactionId: string) {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  if (!tx) return;

  await deleteTransactionRow(userId, tx);
  revalidateTransactionPaths();
}

// Whether this transaction is the reimbursement some split-ledger
// participant was settled with (see shared/actions.ts). Deleting or editing
// it directly would leave that participant showing "已結清" against money
// that no longer matches.
export async function isSettlementTransaction(userId: string, transactionId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: sharedExpenses.id })
    .from(sharedExpenses)
    .where(
      and(
        eq(sharedExpenses.userId, userId),
        sql`${sharedExpenses.participants} @> ${JSON.stringify([{ settlementTransactionId: transactionId }])}::jsonb`,
      ),
    );
  return Boolean(row);
}
