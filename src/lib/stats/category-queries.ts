import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { paymentMethodColor, paymentMethodLabel } from "@/lib/payment-methods";
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

export type PaymentSlice = {
  method: string;
  name: string;
  icon: null;
  color: string;
  amount: number;
  pct: number;
};

export async function getPaymentMethodBreakdown(userId: string, range: StatsRange): Promise<PaymentSlice[]> {
  const rows = await db
    .select({
      paymentMethod: transactions.paymentMethod,
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

  const byMethod = new Map<string, number>();
  for (const r of rows) {
    const amount = Number(r.amount) * Number(r.exchangeRate);
    byMethod.set(r.paymentMethod, (byMethod.get(r.paymentMethod) ?? 0) + amount);
  }
  const total = [...byMethod.values()].reduce((sum, v) => sum + v, 0);
  return [...byMethod.entries()]
    .map(([method, amount]) => ({
      method,
      name: paymentMethodLabel(method),
      // No icon: payment methods render as Lucide glyphs in transaction rows
      // (see PaymentMethodIcon), and this breakdown row already carries a
      // colored bar — an emoji here would be the odd one out.
      icon: null,
      color: paymentMethodColor(method),
      amount,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export type CategoryShareSeries = { id: string; name: string; color: string };
export type CategoryShareBucket = {
  bucketKey: string;
  bucketLabel: string;
  total: number;
} & Record<string, string | number>;
export type CategoryShareTrend = {
  series: CategoryShareSeries[];
  data: CategoryShareBucket[];
};

export async function getCategoryShareTrend(
  userId: string,
  range: StatsRange,
  opts?: { months?: number; topN?: number },
): Promise<CategoryShareTrend> {
  const monthCount = opts?.months ?? 6;
  const topN = opts?.topN ?? 5;

  const monthStarts: Date[] = [];
  let anchor = startOfMonth(range.end);
  for (let i = 0; i < monthCount; i++) {
    monthStarts.unshift(anchor);
    anchor = subMonths(anchor, 1);
  }
  const earliestStr = format(monthStarts[0], "yyyy-MM-dd");
  const latestStr = format(endOfMonth(monthStarts[monthStarts.length - 1]), "yyyy-MM-dd");

  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      amount: transactions.amount,
      exchangeRate: transactions.exchangeRate,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.occurredAt, earliestStr),
        lte(transactions.occurredAt, latestStr),
      ),
    );

  // Rank categories once across the whole window so a category's color/top-N
  // status never flips between adjacent months.
  const totalByCategory = new Map<string, { name: string; color: string; amount: number }>();
  for (const r of rows) {
    const key = r.categoryId ?? "uncategorized";
    const name = r.categoryName ?? "未分類";
    const amount = Number(r.amount) * Number(r.exchangeRate);
    const existing = totalByCategory.get(key);
    if (existing) existing.amount += amount;
    else
      totalByCategory.set(key, {
        name,
        color: getCategoryColor({ color: r.categoryColor, name }),
        amount,
      });
  }
  const topCategoryKeys = new Set(
    [...totalByCategory.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, topN)
      .map(([key]) => key),
  );

  const buckets = monthStarts.map((start) => ({
    start,
    end: endOfMonth(start),
    key: format(start, "yyyy-MM-dd"),
    label: format(start, "M月"),
  }));

  // Category ids (uuid) and the literal "uncategorized" key are already safe
  // CSS-identifier characters, so they double as chart series ids — this
  // avoids feeding user-entered category names (which may contain spaces or
  // symbols) into generated `--color-<key>` CSS custom property names.
  const hasOther = [...totalByCategory.entries()].some(([key]) => !topCategoryKeys.has(key));
  const series: CategoryShareSeries[] = [...topCategoryKeys].map((key) => ({
    id: key,
    name: totalByCategory.get(key)!.name,
    color: totalByCategory.get(key)!.color,
  }));
  if (hasOther) series.push({ id: "other", name: "其他", color: OTHER_COLOR });

  const data = buckets.map((b) => {
    const startStr = format(b.start, "yyyy-MM-dd");
    const endStr = format(b.end, "yyyy-MM-dd");
    // Zero-fill every series up front — a stacked Area chart breaks its path
    // at any bucket where a series key is missing (undefined) rather than 0.
    const values: Record<string, number> = Object.fromEntries(series.map((s) => [s.id, 0]));
    let total = 0;
    for (const r of rows) {
      if (r.occurredAt < startStr || r.occurredAt > endStr) continue;
      const key = r.categoryId ?? "uncategorized";
      const amount = Number(r.amount) * Number(r.exchangeRate);
      total += amount;
      const seriesId = topCategoryKeys.has(key) ? key : "other";
      values[seriesId] = (values[seriesId] ?? 0) + amount;
    }
    return { bucketKey: b.key, bucketLabel: b.label, total, ...values };
  });

  return { series, data };
}
