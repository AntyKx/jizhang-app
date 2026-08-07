import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { detectSpendingAnomalies } from "@/lib/analytics";
import { resolveStatsRange } from "@/lib/stats/range";
import { getPreviousPeriodTotals } from "@/lib/stats/overview-queries";
import { getCategoryBreakdown } from "@/lib/stats/category-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlySummaryCard } from "@/components/stats/monthly-summary-card";
import { CollapsibleProgressList } from "@/components/stats/collapsible-progress-list";
import { StatsTabNav } from "@/components/stats/stats-tab-nav";
import { StatsRangeSwitcher } from "@/components/stats/stats-range-switcher";
import { CategoryIcon } from "@/components/category-icon";
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

  const [rangeTransactions, anomalies, prevTotals, expenseCategories] = await Promise.all([
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
  ]);

  const income = rangeTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount) * Number(t.exchangeRate), 0);
  const expense = rangeTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount) * Number(t.exchangeRate), 0);
  const balance = income - expense;

  const topCategory = expenseCategories[0] ?? null;
  const expensePctChange = prevTotals.expense > 0 ? ((expense - prevTotals.expense) / prevTotals.expense) * 100 : null;

  return (
    <>
      <StatsTabNav active="/stats" />
      <StatsRangeSwitcher basePath="/stats" range={range} />

      {rangeTransactions.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center shadow-md shadow-foreground/10">
          <BearIllustration name="reports" size={96} />
          <p className="text-muted-foreground text-sm">這段時間還沒有任何紀錄，開始記帳來看看你的第一份報表吧！</p>
        </div>
      )}

      <StaggerList className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">收入</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-emerald-600">
              <CountUpNumber value={income} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">支出</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-destructive">
              <CountUpNumber value={expense} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">結餘</CardTitle>
            </CardHeader>
            <CardContent className={cn("text-2xl font-semibold", balance >= 0 ? "text-emerald-600" : "text-destructive")}>
              <CountUpNumber value={balance} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">最大支出分類</CardTitle>
            </CardHeader>
            <CardContent>
              {topCategory ? (
                <div className="flex items-center gap-2">
                  <CategoryIcon icon={topCategory.icon} className="h-8 w-8 text-2xl" />
                  <div>
                    <p className="font-semibold">{topCategory.name}</p>
                    <p className="text-muted-foreground text-sm">
                      <CountUpNumber value={topCategory.amount} />（{Math.round(topCategory.pct)}%）
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">這段時間還沒有支出紀錄</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">支出與上期比較</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        <MonthlySummaryCard />

        {anomalies.length > 0 && (
          <Card className="border-amber-500/50">
            <CardHeader>
              <CardTitle className="text-amber-600">消費異常提醒</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}
      </StaggerList>
    </>
  );
}
