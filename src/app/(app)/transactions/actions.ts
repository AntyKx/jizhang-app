"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and, or, lt, ne, desc, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, sharedExpenses, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ownedCategoryId } from "@/lib/category";
import { todayInTaipeiString } from "@/lib/date";
import { getExchangeRateToTwd } from "@/lib/fx";
import {
  TRANSACTIONS_PAGE_SIZE,
  type ListItemRow,
  type TransactionsCursor,
  type TransactionsFilter,
} from "@/lib/transactions/list-types";
import { transactionsFilterConditions } from "@/lib/transactions/filter";
import { fail, isFail, type Fail } from "@/lib/action-result";

// getExchangeRateToTwd throws its own user-facing message (unreachable FX
// API, unsupported currency) — converted to the same fail() shape as this
// file's own validation checks, without changing fx.ts's own signature
// (it's also called from accounts/page.tsx, a plain render path where
// throwing is the correct/existing behavior).
async function tryExchangeRate(currency: string, date: string): Promise<number | Fail> {
  try {
    return await getExchangeRateToTwd(currency, date);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "無法取得匯率，請稍後再試");
  }
}

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
  paidByMe: z.boolean().optional(),
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
  // Who paid the shared portion — only meaningful alongside isSharedExpense.
  // Defaults to true (the account owner) so every other caller that never
  // passes it keeps the old always-paidByMe behavior.
  paidByMe?: boolean;
}) {
  const userId = await requireUserId();
  const parsed = createTransactionSchema.parse(input);
  const { accountId } = parsed;
  const categoryId = await ownedCategoryId(userId, parsed.categoryId);

  // Partner paid the whole thing — no money actually left any of my own
  // accounts, so this doesn't belong in my personal transaction ledger at
  // all (same as a plain "新增分帳支出" entry from /shared). Only my share
  // becomes a real transaction later, at settlement (see
  // shared/actions.ts's settleSharedExpense) — recording the full amount
  // here too would double-count it.
  if (parsed.isSharedExpense && parsed.type === "expense" && parsed.paidByMe === false) {
    const [created] = await db
      .insert(sharedExpenses)
      .values({
        userId,
        paidByMe: false,
        categoryId,
        name: parsed.merchant || parsed.note || "分帳支出",
        amount: parsed.amount.toString(),
        occurredAt: parsed.occurredAt,
      })
      .returning({ id: sharedExpenses.id });
    revalidateTransactionPaths();
    return { id: created.id };
  }

  const [ownedAccount] = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!ownedAccount) return fail("找不到指定的帳戶");

  const exchangeRate = await tryExchangeRate(ownedAccount.currency, parsed.occurredAt);
  if (isFail(exchangeRate)) return exchangeRate;

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
      categoryId,
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

  // "分帳" checkbox reaching here always means I paid (the paidByMe===false
  // case returned early above without ever creating this transaction).
  // Linked so deleting this transaction cascades to remove the shared-ledger
  // copy (see schema.ts). Everything below runs as a single atomic batch so
  // the transaction, balance update, and shared-ledger copy can never
  // partially fail.
  if (parsed.isSharedExpense && parsed.type === "expense") {
    await db.batch([
      insertTransaction,
      updateAccountBalance,
      db.insert(sharedExpenses).values({
        userId,
        paidByMe: true,
        categoryId,
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
    return fail("轉出與轉入帳戶不能相同");
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
  if (ownedAccounts.length !== 2) return fail("找不到指定的帳戶");
  // Converting between currencies mid-transfer needs its own rate-entry UI
  // (which side does the amount refer to?) that doesn't exist yet — block it
  // rather than silently transferring the same number across currencies.
  if (ownedAccounts[0].currency !== ownedAccounts[1].currency) {
    return fail("目前只支援同幣別帳戶之間轉帳");
  }

  // Needed so a non-TWD transfer fee (see below) converts correctly in net
  // worth — the transferred amount itself always nets to zero across the
  // portfolio regardless of this rate, but the fee doesn't.
  const fromAccountCurrency = ownedAccounts.find((a) => a.id === parsed.fromAccountId)!.currency;
  const exchangeRate = await tryExchangeRate(fromAccountCurrency, parsed.occurredAt);
  if (isFail(exchangeRate)) return exchangeRate;

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
  paidByMe: z.boolean().optional(),
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
  paidByMe?: boolean;
}) {
  const userId = await requireUserId();
  const parsed = updateTransactionSchema.parse(input);

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, parsed.id), eq(transactions.userId, userId)));
  if (!existing) return fail("找不到指定的交易");
  // A transfer debits its source by amount + fee and credits a second
  // account — the income/expense reversal math below can't express that, so
  // running it against one would corrupt both accounts' balances. The UI
  // never opens this dialog for a transfer row; this is the same guard
  // duplicateTransaction already has, for anything that calls in directly.
  if (existing.type === "transfer") return fail("轉帳紀錄請用刪除後重新建立的方式修改");

  const [ownedAccount] = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.accountId), eq(accounts.userId, userId)));
  if (!ownedAccount) return fail("找不到指定的帳戶");

  const categoryId = await ownedCategoryId(userId, parsed.categoryId);

  const exchangeRate = await tryExchangeRate(ownedAccount.currency, parsed.occurredAt);
  if (isFail(exchangeRate)) return exchangeRate;

  // A settled shared-ledger entry already has a reimbursement transaction
  // recorded against the original amount/category — letting the source
  // transaction change out from under it would silently desync the two
  // (see the matching guard in shared/actions.ts's updateSharedExpense).
  const [linkedShared] = await db
    .select({ id: sharedExpenses.id, isSettled: sharedExpenses.isSettled })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.linkedTransactionId, parsed.id), eq(sharedExpenses.userId, userId)));
  if (linkedShared?.isSettled) {
    return fail("這筆交易已建立分帳結算紀錄，請先到分帳頁面處理再編輯");
  }

  const oldDelta = existing.type === "expense" ? -Number(existing.amount) : Number(existing.amount);
  const newDelta = parsed.type === "expense" ? -parsed.amount : parsed.amount;

  const updateTx = db
    .update(transactions)
    .set({
      accountId: parsed.accountId,
      categoryId,
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
  // meaningful for an expense.
  const wantsShared = parsed.type === "expense" && !!parsed.isSharedExpense;

  // Everything runs as one atomic batch so the transaction edit, the balance
  // adjustments on both accounts, and the shared-ledger sync can never
  // partially apply.
  if (wantsShared && parsed.paidByMe === false) {
    // Switched to "partner paid" — same reasoning as createTransaction's:
    // no money actually left any of my accounts, so this transaction
    // shouldn't exist in my personal ledger at all. Delete it (reversing
    // its balance effect on the account it used to sit in; cascades to
    // remove any existing linked shared-ledger row) and record only an
    // unlinked shared-ledger entry instead, same as a plain "新增分帳支出"
    // from /shared. My share only becomes a real transaction later, at
    // settlement.
    await db.batch([
      db.delete(transactions).where(and(eq(transactions.id, parsed.id), eq(transactions.userId, userId))),
      updateOldAccountBalance,
      db.insert(sharedExpenses).values({
        userId,
        paidByMe: false,
        categoryId,
        name: parsed.merchant || parsed.note || "分帳支出",
        amount: parsed.amount.toString(),
        occurredAt: parsed.occurredAt,
      }),
    ]);
  } else if (linkedShared && wantsShared) {
    // Keep the shared-ledger copy in sync with the transaction it was
    // created from — otherwise the shared balance silently drifts from
    // what the personal transaction actually says. paidByMe included here
    // too, so switching who paid on an already-shared transaction actually
    // sticks instead of only ever taking effect on first creation.
    await db.batch([
      updateTx,
      updateOldAccountBalance,
      updateNewAccountBalance,
      db
        .update(sharedExpenses)
        .set({
          name: parsed.merchant || parsed.note || "分帳支出",
          amount: parsed.amount.toString(),
          categoryId,
          occurredAt: parsed.occurredAt,
          paidByMe: parsed.paidByMe ?? true,
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
        paidByMe: parsed.paidByMe ?? true,
        categoryId,
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
  if (!existing) return fail("找不到指定的交易");

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
  if (!existing) return fail("找不到指定的交易");
  if (existing.type === "transfer") return fail("轉帳紀錄不能複製");

  const today = todayInTaipeiString();
  const [account] = await db
    .select({ currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, existing.accountId), eq(accounts.userId, userId)));
  const exchangeRate = account ? await tryExchangeRate(account.currency, today) : 1;
  if (isFail(exchangeRate)) return exchangeRate;

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

// Undo for the "partner paid" branch of createTransaction/updateTransaction
// above, which creates a bare sharedExpenses row instead of a transaction —
// deleteTransaction can't reach it since there's no transaction id. The
// isNull(linkedTransactionId) guard keeps this from ever touching a real
// linked shared-expense row (those go through deleteSharedExpense instead,
// which also blocks deleting a settled one).
export async function deleteUnlinkedSharedExpense(sharedExpenseId: string) {
  const userId = await requireUserId();
  await db
    .delete(sharedExpenses)
    .where(
      and(
        eq(sharedExpenses.id, sharedExpenseId),
        eq(sharedExpenses.userId, userId),
        isNull(sharedExpenses.linkedTransactionId),
      ),
    );
  revalidateTransactionPaths();
}

// Shared by deleteTransaction and shared/actions.ts's unsettleSharedExpense
// — both need to delete a transaction row and reverse its balance effect
// exactly the same way, just gated by different guards (or none, for the
// settlement-revert path, which is itself the sanctioned way to remove a
// settlement transaction).
async function deleteTransactionRow(userId: string, tx: typeof transactions.$inferSelect) {
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
    return fail("這筆交易已建立分帳結算紀錄，請先到分帳頁面處理再刪除");
  }

  // This transaction might instead *be* a settlement reimbursement (see
  // shared/actions.ts's settleSharedExpense) — deleting it out from under
  // its shared-expense row would leave that row stuck showing "已結清" with
  // no reimbursement to back it up. Revert the settlement from /shared
  // instead, which removes this transaction the same way but also resets
  // the shared-expense row.
  const [settledFrom] = await db
    .select({ id: sharedExpenses.id })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.settlementTransactionId, transactionId), eq(sharedExpenses.userId, userId)));
  if (settledFrom) {
    return fail("這是分帳結算交易，請到分帳頁面用「回復結清」處理");
  }

  await deleteTransactionRow(userId, tx);
  revalidateTransactionPaths();
}

// Deletes a transaction and reverses its balance effect, skipping every
// guard deleteTransaction applies. Only for callers that are themselves the
// sanctioned way to remove the transaction they created — shared/actions.ts
// reverting a settlement it made, and subscriptions/actions.ts undoing a
// just-posted occurrence whose rule failed to advance.
export async function deleteTransactionUnchecked(transactionId: string) {
  const userId = await requireUserId();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  if (!tx) return;

  await deleteTransactionRow(userId, tx);
  revalidateTransactionPaths();
}

// Kept as the name shared/actions.ts already calls; same unguarded delete.
export async function deleteSettlementTransaction(transactionId: string) {
  await deleteTransactionUnchecked(transactionId);
}

export async function loadMoreTransactions(cursor: TransactionsCursor, filter?: TransactionsFilter) {
  const userId = await requireUserId();

  // Keyset pagination on the same (occurredAt, createdAt) sort the list
  // renders by — a `before` predicate for whichever row the client last saw.
  const beforeCursor = or(
    lt(transactions.occurredAt, cursor.occurredAt),
    and(eq(transactions.occurredAt, cursor.occurredAt), lt(transactions.createdAt, cursor.createdAt)),
  );

  // Same category/date-range narrowing as the initial page (see
  // /transactions's page.tsx) — keeps "load more" paging through the same
  // filtered set instead of falling back to the unfiltered timeline once
  // scrolled past what the server sent on first load.
  const filterConditions = transactionsFilterConditions(filter);

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
        sharedExpensePaidByMe: sharedExpenses.paidByMe,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(sharedExpenses, eq(sharedExpenses.linkedTransactionId, transactions.id))
      .where(
        and(
          eq(transactions.userId, userId),
          ne(transactions.type, "transfer"),
          beforeCursor,
          ...filterConditions,
        ),
      )
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(TRANSACTIONS_PAGE_SIZE),
    // A category filter never matches a transfer (transfers have no
    // category), so skip that stream entirely rather than querying for rows
    // that can't come back.
    filter?.categoryId !== undefined
      ? Promise.resolve([])
      : db
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
          .where(
            and(
              eq(transactions.userId, userId),
              eq(transactions.type, "transfer"),
              beforeCursor,
              ...filterConditions,
            ),
          )
          .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
          .limit(TRANSACTIONS_PAGE_SIZE),
  ]);

  const merged: ListItemRow[] = [
    ...regularRows.map((t) => ({
      ...t,
      kind: "transaction" as const,
      type: t.type as "income" | "expense",
      isSharedExpense: t.sharedExpenseId !== null,
      paidByMe: t.sharedExpensePaidByMe ?? true,
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
