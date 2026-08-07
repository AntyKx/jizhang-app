import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { budgets, savingsGoals, transactions } from "@/db/schema";
import type { StatsRange } from "@/lib/stats/range";

export type BudgetVsActualPoint = {
  monthKey: string;
  monthLabel: string;
  limitAmount: number | null;
  actual: number;
};

export async function getBudgetVsActualTrend(
  userId: string,
  range: StatsRange,
  opts?: { months?: number; categoryId?: string | null },
): Promise<BudgetVsActualPoint[]> {
  const monthCount = opts?.months ?? 6;
  const categoryId = opts?.categoryId ?? null;

  const monthStarts: Date[] = [];
  let anchor = startOfMonth(range.end);
  for (let i = 0; i < monthCount; i++) {
    monthStarts.unshift(anchor);
    anchor = subMonths(anchor, 1);
  }
  const earliestStr = format(monthStarts[0], "yyyy-MM-dd");
  const latestStr = format(endOfMonth(monthStarts[monthStarts.length - 1]), "yyyy-MM-dd");

  const [txRows, budgetRows] = await Promise.all([
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
          gte(transactions.occurredAt, earliestStr),
          lte(transactions.occurredAt, latestStr),
          ...(categoryId ? [eq(transactions.categoryId, categoryId)] : []),
        ),
      ),
    db
      .select({ month: budgets.month, limitAmount: budgets.limitAmount })
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          categoryId ? eq(budgets.categoryId, categoryId) : isNull(budgets.categoryId),
          gte(budgets.month, earliestStr),
          lte(budgets.month, latestStr),
        ),
      ),
  ]);

  const budgetByMonth = new Map<string, number>();
  for (const b of budgetRows) budgetByMonth.set(b.month, Number(b.limitAmount));

  return monthStarts.map((start) => {
    const end = endOfMonth(start);
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const actual = txRows
      .filter((t) => t.occurredAt >= startStr && t.occurredAt <= endStr)
      .reduce((sum, t) => sum + Number(t.amount) * Number(t.exchangeRate), 0);
    return {
      monthKey: format(start, "yyyy-MM"),
      monthLabel: format(start, "M月"),
      limitAmount: budgetByMonth.get(startStr) ?? null,
      actual,
    };
  });
}

export type SavingsGoalSnapshot = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  currentAmount: number;
  targetAmount: number;
  targetDate: string | null;
  pct: number;
};

export async function getSavingsGoalsSnapshot(userId: string): Promise<SavingsGoalSnapshot[]> {
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.isCompleted, false)))
    .limit(3);

  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color ?? "#22c55e",
    icon: g.icon ?? null,
    currentAmount: Number(g.currentAmount),
    targetAmount: Number(g.targetAmount),
    targetDate: g.targetDate,
    pct: Math.min(100, (Number(g.currentAmount) / Number(g.targetAmount)) * 100),
  }));
}
