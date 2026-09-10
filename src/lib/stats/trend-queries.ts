import { endOfMonth, format, startOfMonth, subMonths, subYears } from "date-fns";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import type { StatsRange } from "@/lib/stats/range";
export type MonthComparisonPoint = {
  monthKey: string;
  monthLabel: string;
  expense: number;
  expenseLastYear: number | null;
};

export async function getMonthComparison(
  userId: string,
  range: StatsRange,
  opts?: { months?: number },
): Promise<MonthComparisonPoint[]> {
  const monthCount = opts?.months ?? 6;

  const monthStarts: Date[] = [];
  let anchor = startOfMonth(range.end);
  for (let i = 0; i < monthCount; i++) {
    monthStarts.unshift(anchor);
    anchor = subMonths(anchor, 1);
  }

  const earliestLastYearStart = subYears(monthStarts[0], 1);
  const latestBucketEnd = endOfMonth(monthStarts[monthStarts.length - 1]);

  const [rows, firstTxRows] = await Promise.all([
    db
      .select({
        amount: transactions.amount,
        exchangeRate: transactions.exchangeRate,
        occurredAt: transactions.occurredAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.occurredAt, format(earliestLastYearStart, "yyyy-MM-dd")),
          lte(transactions.occurredAt, format(latestBucketEnd, "yyyy-MM-dd")),
        ),
      ),
    db
      .select({ occurredAt: transactions.occurredAt })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(asc(transactions.occurredAt))
      .limit(1),
  ]);

  const earliestOverall = firstTxRows[0]?.occurredAt ?? null;

  return monthStarts.map((start) => {
    const end = endOfMonth(start);
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const lastYearStart = subYears(start, 1);
    const lastYearEnd = endOfMonth(lastYearStart);
    const lastYearStartStr = format(lastYearStart, "yyyy-MM-dd");
    const lastYearEndStr = format(lastYearEnd, "yyyy-MM-dd");

    const expense = rows
      .filter((r) => r.occurredAt >= startStr && r.occurredAt <= endStr)
      .reduce((sum, r) => sum + Number(r.amount) * Number(r.exchangeRate), 0);

    // Only claim a same-month-last-year figure if the account already had
    // activity by then — otherwise "0" would misleadingly read as "spent
    // nothing" instead of "no data yet" for newer accounts.
    const hasLastYearData = earliestOverall != null && earliestOverall <= lastYearEndStr;
    const expenseLastYear = hasLastYearData
      ? rows
          .filter((r) => r.occurredAt >= lastYearStartStr && r.occurredAt <= lastYearEndStr)
          .reduce((sum, r) => sum + Number(r.amount) * Number(r.exchangeRate), 0)
      : null;

    return { monthKey: format(start, "yyyy-MM"), monthLabel: format(start, "M月"), expense, expenseLastYear };
  });
}
