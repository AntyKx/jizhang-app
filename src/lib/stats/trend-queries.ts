import { eachDayOfInterval, endOfMonth, format, getDay, parse, startOfMonth, subDays, subMonths, subYears } from "date-fns";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { heatmapLevel } from "@/components/stats/chart-colors";
import type { StatsRange } from "@/lib/stats/range";

export type HeatmapDay = { date: string; amount: number; level: 0 | 1 | 2 | 3 | 4 };

export async function getDailyHeatmap(
  userId: string,
  endDate: Date,
  opts?: { days?: number },
): Promise<HeatmapDay[]> {
  const days = opts?.days ?? 371;
  const start = subDays(endDate, days - 1);

  const rows = await db
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
        gte(transactions.occurredAt, format(start, "yyyy-MM-dd")),
        lte(transactions.occurredAt, format(endDate, "yyyy-MM-dd")),
      ),
    );

  const byDay = new Map<string, number>();
  for (const r of rows) {
    const amount = Number(r.amount) * Number(r.exchangeRate);
    byDay.set(r.occurredAt, (byDay.get(r.occurredAt) ?? 0) + amount);
  }

  const allDays = eachDayOfInterval({ start, end: endDate }).map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, amount: byDay.get(key) ?? 0 };
  });

  const max = Math.max(0, ...allDays.map((d) => d.amount));
  return allDays.map((d) => ({ ...d, level: heatmapLevel(d.amount, max) }));
}

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

export type WeekdayPoint = { weekday: number; label: string; totalAmount: number; avgAmount: number };

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

export async function getWeekdayPattern(
  userId: string,
  range: StatsRange,
  opts?: { lookbackDays?: number },
): Promise<WeekdayPoint[]> {
  const lookbackDays = opts?.lookbackDays ?? 90;
  const end = range.end;
  const start = subDays(end, lookbackDays - 1);

  const rows = await db
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
        gte(transactions.occurredAt, format(start, "yyyy-MM-dd")),
        lte(transactions.occurredAt, format(end, "yyyy-MM-dd")),
      ),
    );

  const totals = new Array(7).fill(0) as number[];
  for (const r of rows) {
    const d = parse(r.occurredAt, "yyyy-MM-dd", new Date());
    totals[getDay(d)] += Number(r.amount) * Number(r.exchangeRate);
  }

  const occurrences = new Array(7).fill(0) as number[];
  for (const day of eachDayOfInterval({ start, end })) {
    occurrences[getDay(day)] += 1;
  }

  return totals.map((total, weekday) => ({
    weekday,
    label: weekdayLabels[weekday],
    totalAmount: total,
    avgAmount: occurrences[weekday] > 0 ? total / occurrences[weekday] : 0,
  }));
}
