import { requireUserId } from "@/lib/auth";
import { resolveStatsRange } from "@/lib/stats/range";
import { getIncomeExpenseTrend } from "@/lib/stats/overview-queries";
import { getCategoryBreakdown, getCategoryDrilldowns, getPaymentMethodBreakdown } from "@/lib/stats/category-queries";
import { getDailyHeatmap, getWeekdayPattern } from "@/lib/stats/trend-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncomeExpenseTrendChart } from "@/components/stats/income-expense-trend-chart";
import { CategoryBreakdownPanel } from "@/components/stats/category-breakdown-panel";
import { SecondaryChartsTabs } from "@/components/stats/secondary-charts-tabs";
import { StatsTabNav } from "@/components/stats/stats-tab-nav";
import { StatsRangeSwitcher } from "@/components/stats/stats-range-switcher";
import { StaggerList } from "@/components/motion/stagger-list";

export default async function StatsDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const range = resolveStatsRange(params);

  const [trend, categoryRows, paymentRows, heatmapDays, weekdayPattern, drilldowns] = await Promise.all([
    getIncomeExpenseTrend(userId, range),
    getCategoryBreakdown(userId, range, "expense"),
    getPaymentMethodBreakdown(userId, range),
    getDailyHeatmap(userId, range.end),
    getWeekdayPattern(userId, range),
    getCategoryDrilldowns(userId, range),
  ]);

  return (
    <>
      <StatsTabNav active="/stats/daily" />
      <StatsRangeSwitcher basePath="/stats/daily" range={range} />

      <StaggerList className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>收支趨勢</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseTrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>支出分類</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownPanel rows={categoryRows} drilldowns={drilldowns} />
          </CardContent>
        </Card>

        <SecondaryChartsTabs
          heatmapDays={heatmapDays}
          weekdayPattern={weekdayPattern}
          paymentRows={paymentRows.map((r) => ({ name: r.name, icon: r.icon, amount: r.amount, color: r.color }))}
        />
      </StaggerList>
    </>
  );
}
