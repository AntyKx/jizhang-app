import { eachDayOfInterval, format } from "date-fns";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { budgets, transactions } from "@/db/schema";
import { bucketLabel, shiftAnchor, unitBounds, type StatsRange } from "@/lib/stats/range";

export type PeriodTotals = { income: number; expense: number };

// Same-length window immediately before `range` (e.g. last month if `range`
// is this month), used to show "vs. previous period" deltas on the overview.
export async function getPreviousPeriodTotals(userId: string, range: StatsRange): Promise<PeriodTotals> {
  const { start, end } = unitBounds(range.unit, shiftAnchor(range.unit, range.start, -1));
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const rows = await db
    .select({ type: transactions.type, amount: transactions.amount, exchangeRate: transactions.exchangeRate })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, startStr), lte(transactions.occurredAt, endStr)));

  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const amount = Number(r.amount) * Number(r.exchangeRate);
    if (r.type === "income") income += amount;
    else if (r.type === "expense") expense += amount;
  }
  return { income, expense };
}

export type TrendPoint = {
  bucketKey: string;
  bucketLabel: string;
  income: number;
  expense: number;
};

export async function getIncomeExpenseTrend(
  userId: string,
  range: StatsRange,
  opts?: { buckets?: number },
): Promise<TrendPoint[]> {
  const bucketCount = opts?.buckets ?? (range.unit === "week" ? 12 : range.unit === "year" ? 5 : 12);

  const buckets: { start: Date; end: Date; key: string; label: string }[] = [];
  let anchor = range.start;
  for (let i = 0; i < bucketCount; i++) {
    const { start, end } = unitBounds(range.unit, anchor);
    buckets.unshift({ start, end, key: format(start, "yyyy-MM-dd"), label: bucketLabel(range.unit, start) });
    anchor = shiftAnchor(range.unit, start, -1);
  }

  const earliestStr = format(buckets[0].start, "yyyy-MM-dd");
  const latestStr = format(buckets[buckets.length - 1].end, "yyyy-MM-dd");

  const rows = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      exchangeRate: transactions.exchangeRate,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, earliestStr),
        lte(transactions.occurredAt, latestStr),
      ),
    );

  return buckets.map((b) => {
    const startStr = format(b.start, "yyyy-MM-dd");
    const endStr = format(b.end, "yyyy-MM-dd");
    let income = 0;
    let expense = 0;
    for (const r of rows) {
      if (r.occurredAt < startStr || r.occurredAt > endStr) continue;
      const amount = Number(r.amount) * Number(r.exchangeRate);
      if (r.type === "income") income += amount;
      else if (r.type === "expense") expense += amount;
    }
    return { bucketKey: b.key, bucketLabel: b.label, income, expense };
  });
}

export type CumulativePoint = {
  day: number;
  date: string;
  cumulative: number;
  budgetPace: number | null;
};

export async function getCumulativeSpending(userId: string, range: StatsRange): Promise<CumulativePoint[]> {
  const [rows, budgetRows] = await Promise.all([
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
          gte(transactions.occurredAt, range.startStr),
          lte(transactions.occurredAt, range.endStr),
        ),
      ),
    db
      .select({ limitAmount: budgets.limitAmount })
      .from(budgets)
      .where(and(eq(budgets.userId, userId), isNull(budgets.categoryId), eq(budgets.month, range.startStr))),
  ]);

  const byDay = new Map<string, number>();
  for (const r of rows) {
    const amount = Number(r.amount) * Number(r.exchangeRate);
    byDay.set(r.occurredAt, (byDay.get(r.occurredAt) ?? 0) + amount);
  }

  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const totalBudget = budgetRows[0] ? Number(budgetRows[0].limitAmount) : null;

  let cumulative = 0;
  return days.map((d, i) => {
    const key = format(d, "yyyy-MM-dd");
    cumulative += byDay.get(key) ?? 0;
    return {
      day: i + 1,
      date: key,
      cumulative,
      budgetPace: totalBudget != null ? (totalBudget * (i + 1)) / days.length : null,
    };
  });
}
