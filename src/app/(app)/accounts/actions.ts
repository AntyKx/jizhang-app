"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, recurringRules, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { pickCategoryColor } from "@/lib/category-color";
import { supportedCurrencies } from "@/lib/currency";
import { getExchangeRateToTwd } from "@/lib/fx";
import { hasCoreAccess } from "@/lib/entitlements";
import { todayInTaipeiString } from "@/lib/date";
import { revalidateTransactionPaths } from "@/lib/transactions/delete-row";
import { fail, isFail, type Fail } from "@/lib/action-result";
import type { AccountType } from "@/lib/account-type";

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

const accountTypeSchema = z.enum(["cash", "bank", "credit_card", "e_wallet", "investment", "loan"]);
const currencySchema = z.enum(
  Object.keys(supportedCurrencies) as [keyof typeof supportedCurrencies, ...(keyof typeof supportedCurrencies)[]],
);

function revalidateAccountPaths() {
  revalidatePath("/accounts");
  revalidatePath("/accounts/archived");
  revalidatePath("/record");
}

const statementDaySchema = z.coerce.number().int().min(1).max(31).nullable().optional();

const createAccountSchema = z.object({
  name: z.string().min(1).max(30),
  type: accountTypeSchema,
  currency: currencySchema.default("TWD"),
  initialBalance: z.coerce.number().default(0),
  excludeFromNetWorth: z.boolean().default(false),
  statementDay: statementDaySchema,
});

export async function createAccount(input: {
  name: string;
  type: AccountType;
  currency?: string;
  initialBalance?: number;
  excludeFromNetWorth?: boolean;
  // Only meaningful for type "credit_card" — ignored (stored as null) for
  // every other type regardless of what's passed in, see below.
  statementDay?: number | null;
}) {
  const userId = await requireUserId();
  const parsed = createAccountSchema.parse(input);

  // Free tier is limited to a single account — multi-account is a
  // core-unlock feature (see src/lib/entitlements.ts). Counts archived
  // accounts too: counting only active ones let the limit be walked past
  // by archiving one, creating another, then unarchiving the first.
  if (!(await hasCoreAccess(userId))) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    if (count >= 1) {
      return fail("免費版限用 1 個帳戶，升級解鎖多帳戶");
    }
  }

  const initialExchangeRate = await tryExchangeRate(parsed.currency, "latest");
  if (isFail(initialExchangeRate)) return initialExchangeRate;

  await db.insert(accounts).values({
    userId,
    name: parsed.name,
    type: parsed.type,
    currency: parsed.currency,
    initialExchangeRate: initialExchangeRate.toString(),
    initialBalance: parsed.initialBalance.toString(),
    currentBalance: parsed.initialBalance.toString(),
    color: pickCategoryColor(parsed.name),
    excludeFromNetWorth: parsed.excludeFromNetWorth,
    statementDay: parsed.type === "credit_card" ? (parsed.statementDay ?? null) : null,
  });

  revalidateAccountPaths();
}

const updateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(30),
  type: accountTypeSchema,
  excludeFromNetWorth: z.boolean(),
  initialBalance: z.coerce.number(),
  statementDay: statementDaySchema,
});

export async function updateAccount(input: {
  id: string;
  name: string;
  type: AccountType;
  excludeFromNetWorth: boolean;
  initialBalance: number;
  statementDay?: number | null;
}) {
  const userId = await requireUserId();
  const parsed = updateAccountSchema.parse(input);

  const [existing] = await db
    .select({ initialBalance: accounts.initialBalance })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.id), eq(accounts.userId, userId)));
  if (!existing) return fail("找不到指定的帳戶");

  // `currentBalance` is a running total (initialBalance + every transaction
  // since), never recomputed from scratch — so correcting a mistyped
  // starting balance has to shift currentBalance by the same delta rather
  // than overwriting it, or every transaction recorded since account
  // creation would silently lose its effect on the balance.
  const delta = parsed.initialBalance - Number(existing.initialBalance);

  await db
    .update(accounts)
    .set({
      name: parsed.name,
      type: parsed.type,
      color: pickCategoryColor(parsed.name),
      excludeFromNetWorth: parsed.excludeFromNetWorth,
      initialBalance: parsed.initialBalance.toString(),
      currentBalance: sql`${accounts.currentBalance} + ${delta}`,
      // Forced to null whenever type isn't (or is changed away from)
      // credit_card, so it can't linger stale if the type changes later.
      statementDay: parsed.type === "credit_card" ? (parsed.statementDay ?? null) : null,
    })
    .where(and(eq(accounts.id, parsed.id), eq(accounts.userId, userId)));

  revalidateAccountPaths();
}

export async function archiveAccount(id: string) {
  const userId = await requireUserId();

  const activeAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)));

  if (activeAccounts.length <= 1 && activeAccounts.some((a) => a.id === id)) {
    return fail("至少要保留一個帳戶，無法封存最後一個帳戶");
  }

  // An archived account is hidden everywhere, but a recurring rule still
  // pointing at it would keep nagging on /record and 一鍵入帳 would post
  // into an account the user can no longer see.
  const [{ count: activeRuleCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recurringRules)
    .where(
      and(eq(recurringRules.userId, userId), eq(recurringRules.accountId, id), eq(recurringRules.isActive, true)),
    );
  if (activeRuleCount > 0) {
    return fail(`有 ${activeRuleCount} 筆定期收支綁在這個帳戶，請先到「訂閱 / 定期收支」改綁其他帳戶或取消`);
  }

  await db
    .update(accounts)
    .set({ isArchived: true })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

  revalidateAccountPaths();
}

export async function unarchiveAccount(id: string) {
  const userId = await requireUserId();

  await db
    .update(accounts)
    .set({ isArchived: false })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

  revalidateAccountPaths();
}

const reorderSchema = z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() }));

export async function reorderAccounts(updates: { id: string; sortOrder: number }[]) {
  const userId = await requireUserId();
  const parsed = reorderSchema.parse(updates);

  await Promise.all(
    parsed.map((u) =>
      db
        .update(accounts)
        .set({ sortOrder: u.sortOrder })
        .where(and(eq(accounts.id, u.id), eq(accounts.userId, userId))),
    ),
  );

  revalidateAccountPaths();
}

const adjustBalanceSchema = z.object({
  accountId: z.string().uuid(),
  actualBalance: z.number().finite(),
});

// 餘額校正: the user types what their bank / card app actually shows and we
// book the difference as one "adjustment" row dated today, so the recorded
// balance matches again without touching any past transaction or the
// opening balance (which would silently rewrite the net-worth history).
// The row is deliberately neither income nor expense — it never shows up
// in spending stats, budgets or reports — and deleting it reverts the
// balance like any other row.
export async function adjustAccountBalance(input: { accountId: string; actualBalance: number }) {
  const userId = await requireUserId();
  const parsed = adjustBalanceSchema.parse(input);

  const [account] = await db
    .select({ currentBalance: accounts.currentBalance, currency: accounts.currency, isArchived: accounts.isArchived })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.accountId), eq(accounts.userId, userId)));
  if (!account) return fail("找不到指定的帳戶");
  if (account.isArchived) return fail("封存的帳戶無法校正餘額");

  // Rounded to cents so float noise (0.1 + 0.2) never books a 0.00000001 row.
  const delta = Math.round((parsed.actualBalance - Number(account.currentBalance)) * 100) / 100;
  if (delta === 0) return fail("餘額已經一致，不需要校正");

  const today = todayInTaipeiString();
  const exchangeRate = await tryExchangeRate(account.currency, today);
  if (isFail(exchangeRate)) return exchangeRate;

  await db.batch([
    db.insert(transactions).values({
      userId,
      accountId: parsed.accountId,
      type: "adjustment",
      amount: delta.toString(),
      exchangeRate: exchangeRate.toString(),
      occurredAt: today,
    }),
    db
      .update(accounts)
      .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
      .where(and(eq(accounts.id, parsed.accountId), eq(accounts.userId, userId))),
  ]);

  revalidateTransactionPaths();
  revalidatePath(`/accounts/${parsed.accountId}`);
  return { delta };
}

// Back of a wallet card on /accounts (accounts-wallet.tsx): this month's
// income/expense on the account and its latest 3 income/expense rows.
// Transfers and balance adjustments are left out — the card's "本月收入/支出"
// should match what the stats pages call income and expense. Amounts are in
// the account's own currency. Fetched on flip, so the page itself pays nothing.
export async function getAccountCardSummary(accountId: string) {
  const userId = await requireUserId();
  const id = z.string().uuid().parse(accountId);
  const monthStart = `${todayInTaipeiString().slice(0, 7)}-01`;
  const own = and(eq(transactions.userId, userId), eq(transactions.accountId, id));
  const incomeOrExpense = inArray(transactions.type, ["income", "expense"]);

  const [[totals], recent] = await Promise.all([
    db
      .select({
        income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} end), 0)`,
        expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} end), 0)`,
      })
      .from(transactions)
      .where(and(own, incomeOrExpense, gte(transactions.occurredAt, monthStart))),
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        occurredAt: transactions.occurredAt,
        merchant: transactions.merchant,
        note: transactions.note,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(own, incomeOrExpense))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(3),
  ]);

  return {
    monthIncome: Number(totals?.income ?? 0),
    monthExpense: Number(totals?.expense ?? 0),
    recent: recent.map((r) => ({
      id: r.id,
      label: r.merchant || r.categoryName || r.note || (r.type === "income" ? "收入" : "支出"),
      amount: r.type === "income" ? Number(r.amount) : -Number(r.amount),
      date: r.occurredAt,
    })),
  };
}
