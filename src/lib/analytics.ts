import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";

export type CategoryAnomaly = {
  categoryName: string;
  thisMonth: number;
  avgPreviousMonths: number;
  pctChange: number;
};

export async function detectSpendingAnomalies(
  userId: string,
): Promise<CategoryAnomaly[]> {
  const now = new Date();
  const rangeStart = format(startOfMonth(subMonths(now, 3)), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const currentMonthKey = format(now, "yyyy-MM");

  const rows = await db
    .select({
      categoryName: categories.name,
      amount: transactions.amount,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        isNotNull(transactions.categoryId),
        gte(transactions.occurredAt, rangeStart),
        lte(transactions.occurredAt, rangeEnd),
      ),
    );

  const byCategory = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const monthKey = row.occurredAt.slice(0, 7);
    const monthMap = byCategory.get(row.categoryName) ?? new Map<string, number>();
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + Number(row.amount));
    byCategory.set(row.categoryName, monthMap);
  }

  const anomalies: CategoryAnomaly[] = [];
  for (const [categoryName, monthMap] of byCategory) {
    const thisMonth = monthMap.get(currentMonthKey) ?? 0;
    const previousMonths = [...monthMap.entries()].filter(
      ([key]) => key !== currentMonthKey,
    );
    if (thisMonth <= 0 || previousMonths.length === 0) continue;

    const avgPreviousMonths =
      previousMonths.reduce((sum, [, v]) => sum + v, 0) / previousMonths.length;
    if (avgPreviousMonths <= 0) continue;

    const pctChange = (thisMonth - avgPreviousMonths) / avgPreviousMonths;
    if (pctChange >= 0.3 && thisMonth - avgPreviousMonths >= 100) {
      anomalies.push({ categoryName, thisMonth, avgPreviousMonths, pctChange });
    }
  }

  return anomalies.sort((a, b) => b.pctChange - a.pctChange);
}
