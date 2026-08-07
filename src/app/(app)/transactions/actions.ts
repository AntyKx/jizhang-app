"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and, or, lt, ne, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, sharedExpenses, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { todayInTaipeiString } from "@/lib/date";
import { getExchangeRateToTwd } from "@/lib/fx";
import {
  TRANSACTIONS_PAGE_SIZE,
  type ListItemRow,
  type TransactionsCursor,
} from "@/lib/transactions/list-types";

function revalidateTransactionPaths() {
  revalidatePath("/record");
  revalidatePath("/calendar");
  revalidatePath("/stats");
  revalidatePath("/transactions");
  revalidatePath("/shared");
  revalidatePath("/accounts");
}

const createTransactionSchema = z.object({
  categoryId: z.string().uuid().optional(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive(),
  paymentMethod: z
    .enum(["cash", "credit_card", "debit_card", "mobile_payment", "auto_debit", "other"])
    .default("cash"),
  accountId: z.string().uuid(),
  note: z.string().max(200).optional(),
  merchant: z.string().max(100).optional(),
  occurredAt: z.string().min(1),
  isSharedExpense: z.boolean().optional(),
});

export async function createTransaction(input: {
  categoryId?: string;
  type: "income" | "expense";
  amount: number;
  paymentMethod?: "cash" | "credit_card" | "debit_card" | "mobile_payment" | "auto_debit" | "other";
  accountId: string;
  note?: string;
  merchant?: string;
  occurredAt: string;
  isSharedExpense?: boolean;
}) {
  const userId = await requireUserId();
  const parsed = createTransactionSchema.parse(input);
  const { accountId } = parsed;

  const [ownedAccount] = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!ownedAccount) throw new Error("找不到指定的帳戶");

  const exchangeRate = await getExchangeRateToTwd(ownedAccount.currency, parsed.occurredAt);

  const delta = parsed.type === "expense" ? -parsed.amount : parsed.amount;
  // Generated up front (instead of relying on the DB default) so the shared-
  // ledger insert below can reference it in the same atomic batch.
  const transactionId = crypto.randomUUID();

  const insertTransaction = db
    .insert(transactions)
    .values({
      id: transactionId,
      userId,
      accountId,
      categoryId: parsed.categoryId,
      type: parsed.type,
      amount: parsed.amount.toString(),
      exchangeRate: exchangeRate.toString(),
      paymentMethod: parsed.paymentMethod,
      note: parsed.note,
      merchant: parsed.merchant,
      occurredAt: parsed.occurredAt,
    })
    .returning({ id: transactions.id });
  const updateAccountBalance = db
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  // "分帳" checkbox — only meaningful for an expense you actually paid for,
  // so it always implies paidByMe=true. Linked so deleting this transaction
  // cascades to remove the shared-ledger copy (see schema.ts). Everything
  // below runs as a single atomic batch so the transaction, balance update,
  // and shared-ledger copy can never partially fail.
  if (parsed.isSharedExpense && parsed.type === "expense") {
    await db.batch([
      insertTransaction,
      updateAccountBalance,
      db.insert(sharedExpenses).values({
        userId,
        paidByMe: true,
        categoryId: parsed.categoryId,
        name: parsed.merchant || parsed.note || "分帳支出",
        amount: parsed.amount.toString(),
        occurredAt: parsed.occurredAt,
        linkedTransactionId: transactionId,
      }),
    ]);
  } else {
    await db.batch([insertTransaction, updateAccountBalance]);
  }

  revalidateTransactionPaths();

  return { id: transactionId };
}

const createTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  fee: z.coerce.number().min(0).default(0),
  note: z.string().max(200).optional(),
  occurredAt: z.string().min(1),
});

export async function createTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fee?: number;
  note?: string;
  occurredAt: string;
}) {
  const userId = await requireUserId();
  const parsed = createTransferSchema.parse(input);
  if (parsed.fromAccountId === parsed.toAccountId) {
    throw new Error("轉出與轉入帳戶不能相同");
  }

  const ownedAccounts = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(
      and(
        inArray(accounts.id, [parsed.fromAccountId, parsed.toAccountId]),
        eq(accounts.userId, userId),
      ),
    );
  if (ownedAccounts.length !== 2) throw new Error("找不到指定的帳戶");
  // Converting between currencies mid-transfer needs its own rate-entry UI
  // (which side does the amount refer to?) that doesn't exist yet — block it
  // rather than silently transferring the same number across currencies.
  if (ownedAccounts[0].currency !== ownedAccounts[1].currency) {
    throw new Error("目前只支援同幣別帳戶之間轉帳");
  }

  // Needed so a non-TWD transfer fee (see below) converts correctly in net
  // worth — the transferred amount itself always nets to zero across the
  // portfolio regardless of this rate, but the fee doesn't.
  const fromAccountCurrency = ownedAccounts.find((a) => a.id === parsed.fromAccountId)!.currency;
  const exchangeRate = await getExchangeRateToTwd(fromAccountCurrency, parsed.occurredAt);

  // The fee is money that leaves the source account but never arrives at
  // the destination (paid to the bank/service, not to either account), so
  // only the source side is debited by amount + fee.
  const [insertedRows] = await db.batch([
    db
      .insert(transactions)
      .values({
        userId,
        accountId: parsed.fromAccountId,
        toAccountId: parsed.toAccountId,
        type: "transfer",
        amount: parsed.amount.toString(),
        feeAmount: parsed.fee.toString(),
        exchangeRate: exchangeRate.toString(),
        note: parsed.note,
        occurredAt: parsed.occurredAt,
      })
      .returning({ id: transactions.id }),
    db
      .update(accounts)
      .set({ currentBalance: sql`${accounts.currentBalance} - ${parsed.amount + parsed.fee}` })
      .where(and(eq(accounts.id, parsed.fromAccountId), eq(accounts.userId, userId))),
    db
      .update(accounts)
      .set({ currentBalance: sql`${accounts.currentBalance} + ${parsed.amount}` })
      .where(and(eq(accounts.id, parsed.toAccountId), eq(accounts.userId, userId))),
  ]);

  revalidateTransactionPaths();

  return { id: insertedRows[0].id };
}

const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive(),
  paymentMethod: z
    .enum(["cash", "credit_card", "debit_card", "mobile_payment", "auto_debit", "other"])
    .default("cash"),
  accountId: z.string().uuid(),
  note: z.string().max(200).nullable(),
  merchant: z.string().max(100).nullable(),
  occurredAt: z.string().min(1),
  isSharedExpense: z.boolean().optional(),
});

export async function updateTransaction(input: {
  id: string;
  categoryId: string | null;
  type: "income" | "expense";
  amount: number;
  paymentMethod?: "cash" | "credit_card" | "debit_card" | "mobile_payment" | "auto_debit" | "other";
  accountId: string;
  note: string | null;
  merchant: string | null;
  occurredAt: string;
  isSharedExpense?: boolean;
}) {
  const userId = await requireUserId();
  const parsed = updateTransactionSchema.parse(input);

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, parsed.id), eq(transactions.userId, userId)));
  if (!existing) throw new Error("找不到指定的交易");

  const [ownedAccount] = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.accountId), eq(accounts.userId, userId)));
  if (!ownedAccount) throw new Error("找不到指定的帳戶");

  const exchangeRate = await getExchangeRateToTwd(ownedAccount.currency, parsed.occurredAt);

  // A settled shared-ledger entry already has a reimbursement transaction
  // recorded against the original amount/category — letting the source
  // transaction change out from under it would silently desync the two
  // (see the matching guard in shared/actions.ts's updateSharedExpense).
  const [linkedShared] = await db
    .select({ id: sharedExpenses.id, isSettled: sharedExpenses.isSettled })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.linkedTransactionId, parsed.id), eq(sharedExpenses.userId, userId)));
  if (linkedShared?.isSettled) {
    throw new Error("這筆交易已建立分帳結算紀錄，請先到分帳頁面處理再編輯");
  }

  const oldDelta = existing.type === "expense" ? -Number(existing.amount) : Number(existing.amount);
  const newDelta = parsed.type === "expense" ? -parsed.amount : parsed.amount;

  const updateTx = db
    .update(transactions)
    .set({
      accountId: parsed.accountId,
      categoryId: parsed.categoryId,
      type: parsed.type,
      amount: parsed.amount.toString(),
      exchangeRate: exchangeRate.toString(),
      paymentMethod: parsed.paymentMethod,
      note: parsed.note,
      merchant: parsed.merchant,
      occurredAt: parsed.occurredAt,
    })
    .where(and(eq(transactions.id, parsed.id), eq(transactions.userId, userId)));
  const updateOldAccountBalance = db
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} - ${oldDelta}` })
    .where(and(eq(accounts.id, existing.accountId), eq(accounts.userId, userId)));
  const updateNewAccountBalance = db
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} + ${newDelta}` })
    .where(and(eq(accounts.id, parsed.accountId), eq(accounts.userId, userId)));

  // "分帳" checkbox, same semantics as createTransaction's — only
  // meaningful for an expense, always implies paidByMe=true.
  const wantsShared = parsed.type === "expense" && !!parsed.isSharedExpense;

  // Everything runs as one atomic batch so the transaction edit, the balance
  // adjustments on both accounts, and the shared-ledger sync can never
  // partially apply.
  if (linkedShared && wantsShared) {
    // Keep the shared-ledger copy in sync with the transaction it was
    // created from — otherwise the shared balance silently drifts from
    // what the personal transaction actually says.
    await db.batch([
      updateTx,
      updateOldAccountBalance,
      updateNewAccountBalance,
      db
        .update(sharedExpenses)
        .set({
          name: parsed.merchant || parsed.note || "分帳支出",
          amount: parsed.amount.toString(),
          categoryId: parsed.categoryId,
          occurredAt: parsed.occurredAt,
        })
        .where(eq(sharedExpenses.id, linkedShared.id)),
    ]);
  } else if (linkedShared) {
    // No longer wanted as a shared cost (type changed away from expense, or
    // the user unchecked the toggle) — drop the shared-ledger copy.
    await db.batch([
      updateTx,
      updateOldAccountBalance,
      updateNewAccountBalance,
      db.delete(sharedExpenses).where(eq(sharedExpenses.id, linkedShared.id)),
    ]);
  } else if (wantsShared) {
    // Wasn't shared before, now toggled on — create the shared-ledger copy,
    // same shape as the one createTransaction inserts.
    await db.batch([
      updateTx,
      updateOldAccountBalance,
      updateNewAccountBalance,
      db.insert(sharedExpenses).values({
        userId,
        paidByMe: true,
        categoryId: parsed.categoryId,
        name: parsed.merchant || parsed.note || "分帳支出",
        amount: parsed.amount.toString(),
        occurredAt: parsed.occurredAt,
        linkedTransactionId: parsed.id,
      }),
    ]);
  } else {
    await db.batch([updateTx, updateOldAccountBalance, updateNewAccountBalance]);
  }

  revalidateTransactionPaths();
}

export async function updateTransactionCategory(transactionId: string, categoryId: string | null) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  if (!existing) throw new Error("找不到指定的交易");

  await db
    .update(transactions)
    .set({ categoryId })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  revalidateTransactionPaths();
}

export async function duplicateTransaction(transactionId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  if (!existing) throw new Error("找不到指定的交易");
  if (existing.type === "transfer") throw new Error("轉帳紀錄不能複製");

  const [account] = await db
    .select({ currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, existing.accountId), eq(accounts.userId, userId)));
  const today = todayInTaipeiString();
  const exchangeRate = account ? await getExchangeRateToTwd(account.currency, today) : 1;

  const delta = existing.type === "expense" ? -Number(existing.amount) : Number(existing.amount);

  const [insertedRows] = await db.batch([
    db
      .insert(transactions)
      .values({
        userId,
        accountId: existing.accountId,
        categoryId: existing.categoryId,
        type: existing.type,
        amount: existing.amount,
        exchangeRate: exchangeRate.toString(),
        paymentMethod: existing.paymentMethod,
        note: existing.note,
        merchant: existing.merchant,
        occurredAt: today,
      })
      .returning({ id: transactions.id }),
    db
      .update(accounts)
      .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
      .where(and(eq(accounts.id, existing.accountId), eq(accounts.userId, userId))),
  ]);

  revalidateTransactionPaths();

  return { id: insertedRows[0].id };
}

export async function deleteTransaction(transactionId: string) {
  const userId = await requireUserId();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  if (!tx) return;

  // Deleting cascades (see schema.ts) to remove any linked shared-ledger
  // copy — fine for an unsettled one, but a settled one already has a real
  // reimbursement transaction recorded against it, and losing that record
  // silently would leave the reimbursement looking unexplained.
  const [linkedShared] = await db
    .select({ isSettled: sharedExpenses.isSettled })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.linkedTransactionId, transactionId), eq(sharedExpenses.userId, userId)));
  if (linkedShared?.isSettled) {
    throw new Error("這筆交易已建立分帳結算紀錄，請先到分帳頁面處理再刪除");
  }

  const deleteTx = db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

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

  revalidateTransactionPaths();
}

export async function loadMoreTransactions(cursor: TransactionsCursor) {
  const userId = await requireUserId();

  // Keyset pagination on the same (occurredAt, createdAt) sort the list
  // renders by — a `before` predicate for whichever row the client last saw.
  const beforeCursor = or(
    lt(transactions.occurredAt, cursor.occurredAt),
    and(eq(transactions.occurredAt, cursor.occurredAt), lt(transactions.createdAt, cursor.createdAt)),
  );

  const [regularRows, transferRows] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        note: transactions.note,
        merchant: transactions.merchant,
        occurredAt: transactions.occurredAt,
        createdAt: transactions.createdAt,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        paymentMethod: transactions.paymentMethod,
        accountId: transactions.accountId,
        sharedExpenseId: sharedExpenses.id,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(sharedExpenses, eq(sharedExpenses.linkedTransactionId, transactions.id))
      .where(and(eq(transactions.userId, userId), ne(transactions.type, "transfer"), beforeCursor))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(TRANSACTIONS_PAGE_SIZE),
    db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        feeAmount: transactions.feeAmount,
        note: transactions.note,
        occurredAt: transactions.occurredAt,
        createdAt: transactions.createdAt,
        fromAccountId: transactions.accountId,
        toAccountId: transactions.toAccountId,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "transfer"), beforeCursor))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(TRANSACTIONS_PAGE_SIZE),
  ]);

  const merged: ListItemRow[] = [
    ...regularRows.map((t) => ({
      ...t,
      kind: "transaction" as const,
      type: t.type as "income" | "expense",
      isSharedExpense: t.sharedExpenseId !== null,
    })),
    ...transferRows.map((t) => ({ ...t, kind: "transfer" as const })),
  ].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  // Either stream hitting the page size means there could be more of that
  // type beyond this fetch, even if the merged/sorted page below is shorter.
  const mightHaveMore =
    merged.length > TRANSACTIONS_PAGE_SIZE ||
    regularRows.length === TRANSACTIONS_PAGE_SIZE ||
    transferRows.length === TRANSACTIONS_PAGE_SIZE;

  const page = merged.slice(0, TRANSACTIONS_PAGE_SIZE);
  const last = page[page.length - 1];

  return {
    items: page,
    nextCursor:
      mightHaveMore && last ? { occurredAt: last.occurredAt, createdAt: last.createdAt } : null,
  };
}
