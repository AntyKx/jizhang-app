import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { detectSpendingAnomalies } from "@/lib/analytics";
import { resolveStatsRange } from "@/lib/stats/range";
import { getCumulativeSpending, getPreviousPeriodTotals } from "@/lib/stats/overview-queries";
import { getCategoryBreakdown } from "@/lib/stats/category-queries";
import { MonthlySummaryCard } from "@/components/stats/monthly-summary-card";
import { CollapsibleProgressList } from "@/components/stats/collapsible-progress-list";
import { StatsTabNav } from "@/components/stats/stats-tab-nav";
import { StatsRangeSwitcher } from "@/components/stats/stats-range-switcher";
import { CategoryOverviewList } from "@/components/stats/category-overview-list";
import { CumulativeSpendChart } from "@/components/stats/cumulative-spend-chart";
import { SavingsRateCard } from "@/components/stats/savings-rate-card";
import { StaggerList } from "@/components/motion/stagger-list";
import { CountUpNumber } from "@/components/motion/count-up-number";
import { BearIllustration } from "@/components/bear-illustration";
import { cn } from "@/lib/utils";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const range = resolveStatsRange(params);

  const [rangeTransactions, anomalies, prevTotals, expenseCategories, cumulative] = await Promise.all([
    db
      .select({ type: transactions.type, amount: transactions.amount, exchangeRate: transactions.exchangeRate })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, range.startStr),
          lte(transactions.occurredAt, range.endStr),
        ),
      ),
    detectSpendingAnomalies(userId, range.end),
    getPreviousPeriodTotals(userId, range),
    getCategoryBreakdown(userId, range, "expense"),
    getCumulativeSpending(userId, range),
  ]);

  const income = rangeTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount) * Number(t.exchangeRate), 0);
  const expense = rangeTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount) * Number(t.exchangeRate), 0);
  const balance = income - expense;

  const expensePctChange = prevTotals.expense > 0 ? ((expense - prevTotals.expense) / prevTotals.expense) * 100 : null;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null;
  const prevSavingsRate =
    prevTotals.income > 0 ? ((prevTotals.income - prevTotals.expense) / prevTotals.income) * 100 : null;

  return (
    <>
      <StatsTabNav active="/stats" />
      <StatsRangeSwitcher basePath="/stats" range={range} />

      {rangeTransactions.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <BearIllustration name="reports" size={96} />
          <p className="text-muted-foreground text-sm">這段時間還沒有任何紀錄，開始記帳來看看你的第一份報表吧！</p>
        </div>
      )}

      <StaggerList className="flex flex-col gap-6">
        {/* Income/expense/balance merged into one banner (rather than 3
            separate Cards) — they're 3 facets of the same equation, not
            independent datasets, so they read better as one grouped stat
            row than as 3 boxes. */}
        <div className="flex items-stretch divide-x rounded-3xl bg-muted/40 py-4">
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-muted-foreground text-sm font-normal">收入</span>
            <span className="text-lg font-semibold text-emerald-600">
              <CountUpNumber value={income} />
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-muted-foreground text-sm font-normal">支出</span>
            <span className="text-lg font-semibold text-destructive">
              <CountUpNumber value={expense} />
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-muted-foreground text-sm font-normal">結餘</span>
            <span className={cn("text-lg font-semibold", balance >= 0 ? "text-emerald-600" : "text-destructive")}>
              <CountUpNumber value={balance} />
            </span>
          </div>
        </div>

        {/* Sits directly under the income/expense row it's derived from —
            the same three numbers expressed as the one rate that actually
            says whether the period went well. */}
        <SavingsRateCard income={income} expense={expense} rate={savingsRate} previousRate={prevSavingsRate} />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">支出與上期比較</h2>
          {expensePctChange === null ? (
            <p className="text-muted-foreground text-sm">上一期沒有支出紀錄可比較</p>
          ) : (
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                expensePctChange > 0 ? "text-destructive" : "text-emerald-600",
              )}
            >
              {expensePctChange > 0 ? "↑" : expensePctChange < 0 ? "↓" : ""}
              {Math.abs(Math.round(expensePctChange))}%
            </p>
          )}
        </section>

        {/* Moved up from the old 進階分析 tab — "am I burning through this
            month too fast" is a this-month question, and with the budget
            pace line it's the one chart here you'd actually act on
            mid-period rather than review afterwards. */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">支出步調</h2>
          <CumulativeSpendChart data={cumulative} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">支出分類</h2>
          <CategoryOverviewList
            rows={expenseCategories}
            rangeStart={range.startStr}
            rangeEnd={range.endStr}
            rangeLabel={range.label}
          />
        </section>

        <MonthlySummaryCard unit={range.unit} dateParam={range.dateParam} label={range.label} />

        {anomalies.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-amber-600">消費異常提醒</h2>
            <CollapsibleProgressList
              gapClassName="gap-2"
              items={anomalies.map((a) => ({
                key: a.categoryName,
                node: (
                  <div className="flex justify-between text-sm">
                    <span>{a.categoryName}</span>
                    <span className="text-amber-600 tabular-nums">
                      本月 {Math.round(a.thisMonth).toLocaleString("zh-TW")}，較平均高{" "}
                      {Math.round(a.pctChange * 100)}%
                    </span>
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
