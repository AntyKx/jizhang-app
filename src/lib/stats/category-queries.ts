import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { getCategoryColor, OTHER_COLOR } from "@/components/stats/chart-colors";
import type { StatsRange } from "@/lib/stats/range";

export type CategorySlice = {
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string;
  amount: number;
  pct: number;
};

export async function getCategoryBreakdown(
  userId: string,
  range: StatsRange,
  type: "expense" | "income" = "expense",
): Promise<CategorySlice[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      amount: transactions.amount,
      exchangeRate: transactions.exchangeRate,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, type),
        gte(transactions.occurredAt, range.startStr),
        lte(transactions.occurredAt, range.endStr),
      ),
    );

  const byCategory = new Map<string, { name: string; icon: string | null; color: string; amount: number }>();
  for (const r of rows) {
    const key = r.categoryId ?? "uncategorized";
    const name = r.categoryName ?? "未分類";
    const amount = Number(r.amount) * Number(r.exchangeRate);
    const existing = byCategory.get(key);
    if (existing) {
      existing.amount += amount;
    } else {
      byCategory.set(key, {
        name,
        icon: r.categoryIcon,
        color: getCategoryColor({ color: r.categoryColor, name }),
        amount,
      });
    }
  }

  const total = [...byCategory.values()].reduce((sum, c) => sum + c.amount, 0);
  return [...byCategory.entries()]
    .map(([key, c]) => ({
      categoryId: key === "uncategorized" ? null : key,
      name: c.name,
      icon: c.icon,
      color: c.color,
      amount: c.amount,
      pct: total > 0 ? (c.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export type CategoryDrilldownItem = { merchant: string; amount: number };

// Powers CategoryDrilldownList (tap a category -> see its top merchants).
// Groups the same expense rows getCategoryBreakdown already fetches by
// (categoryId, merchant/note) and keeps each category's top few merchants,
// computed up front so expanding a row needs no extra round-trip.
export async function getCategoryDrilldowns(
  userId: string,
  range: StatsRange,
): Promise<Record<string, CategoryDrilldownItem[]>> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      merchant: transactions.merchant,
      note: transactions.note,
      amount: transactions.amount,
      exchangeRate: transactions.exchangeRate,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.occurredAt, range.startStr),
        lte(transactions.occurredAt, range.endStr),
      ),
    );

  const byCategory = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const categoryKey = r.categoryId ?? "uncategorized";
    const label = r.merchant || r.note || "其他";
    const amount = Number(r.amount) * Number(r.exchangeRate);
    const byMerchant = byCategory.get(categoryKey) ?? new Map<string, number>();
    byMerchant.set(label, (byMerchant.get(label) ?? 0) + amount);
    byCategory.set(categoryKey, byMerchant);
  }

  const result: Record<string, CategoryDrilldownItem[]> = {};
  for (const [categoryKey, byMerchant] of byCategory) {
    result[categoryKey] = [...byMerchant.entries()]
      .map(([merchant, amount]) => ({ merchant, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }
  return result;
}

export type AccountSlice = {
  accountId: string;
  name: string;
  icon: null;
  color: string;
  amount: number;
  pct: number;
};

// "Where did this period's spending come from" — grouped by the account the
// money actually left. This replaced a 付款方式 breakdown, which drew on a
// field that mostly just restated the account anyway and disagreed with it
// in ~19% of rows (see the 2026-09-09 payment-method rework); the account
// is the reliable version of the same question.
//
// Archived accounts are deliberately included: the spending genuinely
// happened out of them, and dropping it would make the slices stop summing
// to the period's real expense total.
export async function getAccountBreakdown(userId: string, range: StatsRange): Promise<AccountSlice[]> {
  const rows = await db
    .select({
      accountId: transactions.accountId,
      accountName: accounts.name,
      accountColor: accounts.color,
      amount: transactions.amount,
      exchangeRate: transactions.exchangeRate,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.occurredAt, range.startStr),
        lte(transactions.occurredAt, range.endStr),
      ),
    );

  const byAccount = new Map<string, { name: string; color: string; amount: number }>();
  for (const r of rows) {
    const amount = Number(r.amount) * Number(r.exchangeRate);
    const existing = byAccount.get(r.accountId);
    if (existing) existing.amount += amount;
    else byAccount.set(r.accountId, { name: r.accountName, color: r.accountColor ?? OTHER_COLOR, amount });
  }
  const total = [...byAccount.values()].reduce((sum, a) => sum + a.amount, 0);
  return [...byAccount.entries()]
    .map(([accountId, a]) => ({
      accountId,
      name: a.name,
      // No icon: an account's identity renders as a Lucide type glyph
      // elsewhere (AccountTypeIcon), and this row already carries a colored
      // bar — a category-style icon here would be the odd one out.
      icon: null,
      color: a.color,
      amount: a.amount,
      pct: total > 0 ? (a.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
