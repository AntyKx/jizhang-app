import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { requireCoreAccess } from "@/lib/entitlements";
import { resolveStatsRange } from "@/lib/stats/range";
import { getBudgetVsActualTrend, getSavingsGoalsSnapshot } from "@/lib/stats/budget-goal-queries";
import { Progress } from "@/components/ui/progress";
import { BudgetVsActualChart } from "@/components/stats/budget-vs-actual-chart";
import { CollapsibleProgressList } from "@/components/stats/collapsible-progress-list";
import { StatsTabNav } from "@/components/stats/stats-tab-nav";
import { StatsRangeSwitcher } from "@/components/stats/stats-range-switcher";
import { StaggerList } from "@/components/motion/stagger-list";
import { CountUpNumber } from "@/components/motion/count-up-number";

export default async function StatsBudgetsGoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "stats-budgets-goals");
  const params = await searchParams;
  const range = resolveStatsRange(params);

  const [rangeTransactions, monthBudgets, goals, budgetTrend] = await Promise.all([
    db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        exchangeRate: transactions.exchangeRate,
        categoryId: transactions.categoryId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, range.startStr),
          lte(transactions.occurredAt, range.endStr),
        ),
      ),
    db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        limitAmount: budgets.limitAmount,
        categoryName: categories.name,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, userId), eq(budgets.month, range.startStr))),
    getSavingsGoalsSnapshot(userId),
    getBudgetVsActualTrend(userId, range),
  ]);

  const expense = rangeTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount) * Number(t.exchangeRate), 0);

  const spentByCategory = new Map<string, number>();
  for (const t of rangeTransactions) {
    if (t.type !== "expense" || !t.categoryId) continue;
    const amount = Number(t.amount) * Number(t.exchangeRate);
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + amount);
  }

  return (
    <>
      <StatsTabNav active="/stats/budgets-goals" />
      <StatsRangeSwitcher basePath="/stats/budgets-goals" range={range} />

      <StaggerList className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">整體預算 vs 實際（近 6 個月）</h2>
          <BudgetVsActualChart data={budgetTrend} />
        </section>

        {monthBudgets.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">本期預算</h2>
            <CollapsibleProgressList
              gapClassName="gap-4"
              items={monthBudgets.map((b) => {
                const spent = b.categoryId ? spentByCategory.get(b.categoryId) ?? 0 : expense;
                const pct = Math.min(100, (spent / Number(b.limitAmount)) * 100);
                return {
                  key: b.id,
                  node: (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm">
                        <span>{b.categoryName ?? "整體預算"}</span>
                        <span className={pct >= 100 ? "text-destructive" : "text-muted-foreground"}>
                          <CountUpNumber value={spent} /> / <CountUpNumber value={Number(b.limitAmount)} />
                        </span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  ),
                };
              })}
            />
          </section>
        ) : (
          <p className="text-muted-foreground text-sm">這個範圍還沒有設定預算。</p>
        )}

        {goals.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">儲蓄目標</h2>
            <CollapsibleProgressList
              gapClassName="gap-4"
              items={goals.map((g) => ({
                key: g.id,
                node: (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{g.name}</span>
                      <span className="text-muted-foreground">
                        <CountUpNumber value={g.currentAmount} /> / <CountUpNumber value={g.targetAmount} />
                      </span>
                    </div>
                    <Progress value={g.pct} />
                  </div>
                ),
              }))}
            />
          </section>
        )}
      </StaggerList>
    </>
  );
}
