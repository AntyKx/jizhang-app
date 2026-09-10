import { differenceInCalendarDays, format } from "date-fns";
import { and, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";
import { bucketLabel, shiftAnchor, unitBounds, type StatsRange } from "@/lib/stats/range";

// income - expense as a share of income. Null (not 0) when there's no
// income in the period at all — "didn't earn anything this month" and
// "saved 0% of what I earned" are different facts, and averaging a
// fabricated 0 into the trend line would drag it down for no reason.
function rateOf(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return ((income - expense) / income) * 100;
}

export type SavingsRatePoint = {
  bucketKey: string;
  bucketLabel: string;
  income: number;
  expense: number;
  rate: number | null;
};

// The headline personal-finance number the app was computing the pieces of
// (income, expense, 結餘) but never actually expressing as a rate — "saved
// 23% of what I earned" drives behaviour in a way "結餘 12,000" doesn't.
export async function getSavingsRateTrend(
  userId: string,
  range: StatsRange,
  opts?: { buckets?: number },
): Promise<SavingsRatePoint[]> {
  const bucketCount = opts?.buckets ?? (range.unit === "year" ? 5 : 6);

  const buckets: { start: Date; end: Date; key: string; label: string }[] = [];
  let anchor = range.start;
  for (let i = 0; i < bucketCount; i++) {
    const { start, end } = unitBounds(range.unit, anchor);
    buckets.unshift({ start, end, key: format(start, "yyyy-MM-dd"), label: bucketLabel(range.unit, start) });
    anchor = shiftAnchor(range.unit, start, -1);
  }

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
        gte(transactions.occurredAt, format(buckets[0].start, "yyyy-MM-dd")),
        lte(transactions.occurredAt, format(buckets[buckets.length - 1].end, "yyyy-MM-dd")),
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
    return { bucketKey: b.key, bucketLabel: b.label, income, expense, rate: rateOf(income, expense) };
  });
}

export type FixedVsVariable = { fixed: number; variable: number; fixedPct: number | null };

// "Fixed" is taken straight from whether the expense was posted by a
// recurring rule (rent, insurance, subscriptions) rather than guessed from
// categories — the app already knows which transactions came from
// /subscriptions, so this is a fact, not a heuristic. Knowing the baseline
// burn is what makes the rest of the money legible as discretionary.
export async function getFixedVsVariable(userId: string, range: StatsRange): Promise<FixedVsVariable> {
  const [fixedRows, variableRows] = await Promise.all([
    db
      .select({ amount: transactions.amount, exchangeRate: transactions.exchangeRate })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          isNotNull(transactions.recurringRuleId),
          gte(transactions.occurredAt, range.startStr),
          lte(transactions.occurredAt, range.endStr),
        ),
      ),
    db
      .select({ amount: transactions.amount, exchangeRate: transactions.exchangeRate })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          isNull(transactions.recurringRuleId),
          gte(transactions.occurredAt, range.startStr),
          lte(transactions.occurredAt, range.endStr),
        ),
      ),
  ]);

  const sum = (rows: { amount: string; exchangeRate: string }[]) =>
    rows.reduce((total, r) => total + Number(r.amount) * Number(r.exchangeRate), 0);

  const fixed = sum(fixedRows);
  const variable = sum(variableRows);
  const total = fixed + variable;

  return { fixed, variable, fixedPct: total > 0 ? (fixed / total) * 100 : null };
}

export type MerchantRow = { name: string; amount: number; count: number };

// Flat cross-category ranking — the app already drills from a category into
// its own merchants, but "餐飲 15,000" isn't actionable while "全家 3,200"
// is. Rows with neither a merchant nor a note are skipped rather than
// bucketed into "其他", which would otherwise swamp the top of the list
// without naming anything you could actually change.
export async function getTopMerchants(userId: string, range: StatsRange, limit = 10): Promise<MerchantRow[]> {
  const rows = await db
    .select({
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

  const byName = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    const name = (r.merchant || r.note || "").trim();
    if (!name) continue;
    const entry = byName.get(name) ?? { amount: 0, count: 0 };
    entry.amount += Number(r.amount) * Number(r.exchangeRate);
    entry.count += 1;
    byName.set(name, entry);
  }

  return [...byName.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export type PeriodHighlights = {
  biggest: { amount: number; label: string; date: string } | null;
  mostVisited: { name: string; count: number } | null;
  transactionCount: number;
  dailyAverage: number;
};

// Deliberately range-agnostic rather than a year-only "年度回顧" screen —
// switching the existing range switcher to 年 turns this into exactly that,
// while the same section still earns its place on a month or a week.
export async function getPeriodHighlights(userId: string, range: StatsRange): Promise<PeriodHighlights> {
  const rows = await db
    .select({
      amount: transactions.amount,
      exchangeRate: transactions.exchangeRate,
      merchant: transactions.merchant,
      note: transactions.note,
      occurredAt: transactions.occurredAt,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.occurredAt, range.startStr),
        lte(transactions.occurredAt, range.endStr),
      ),
    );

  let biggest: PeriodHighlights["biggest"] = null;
  let total = 0;
  const visitCount = new Map<string, number>();

  for (const r of rows) {
    const amount = Number(r.amount) * Number(r.exchangeRate);
    total += amount;
    if (!biggest || amount > biggest.amount) {
      biggest = {
        amount,
        label: r.merchant || r.note || r.categoryName || "未分類",
        date: r.occurredAt,
      };
    }
    const name = (r.merchant || "").trim();
    if (name) visitCount.set(name, (visitCount.get(name) ?? 0) + 1);
  }

  const mostVisited = [...visitCount.entries()].sort((a, b) => b[1] - a[1])[0];

  // Averaging over days actually elapsed, not the whole calendar period —
  // on day 3 of a month, dividing this month's spend by 31 would report a
  // daily average roughly a tenth of what's really being spent per day.
  const today = getTodayInTaipei();
  const effectiveEnd = range.end > today ? today : range.end;
  const elapsedDays = Math.max(differenceInCalendarDays(effectiveEnd, range.start) + 1, 1);

  return {
    biggest,
    mostVisited: mostVisited ? { name: mostVisited[0], count: mostVisited[1] } : null,
    transactionCount: rows.length,
    dailyAverage: total / elapsedDays,
  };
}
