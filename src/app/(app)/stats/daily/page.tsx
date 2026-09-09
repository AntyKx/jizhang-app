import { requireUserId } from "@/lib/auth";
import { resolveStatsRange } from "@/lib/stats/range";
import { getIncomeExpenseTrend } from "@/lib/stats/overview-queries";
import { getAccountBreakdown, getCategoryBreakdown, getCategoryDrilldowns } from "@/lib/stats/category-queries";
import { getDailyHeatmap, getWeekdayPattern } from "@/lib/stats/trend-queries";
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

  const [trend, categoryRows, accountRows, heatmapDays, weekdayPattern, drilldowns] = await Promise.all([
    getIncomeExpenseTrend(userId, range),
    getCategoryBreakdown(userId, range, "expense"),
    getAccountBreakdown(userId, range),
    getDailyHeatmap(userId, range.end),
    getWeekdayPattern(userId, range),
    getCategoryDrilldowns(userId, range),
  ]);

  return (
    <>
      <StatsTabNav active="/stats/daily" />
      <StatsRangeSwitcher basePath="/stats/daily" range={range} />

      <StaggerList className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">收支趨勢</h2>
          <IncomeExpenseTrendChart data={trend} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">支出分類</h2>
          <CategoryBreakdownPanel rows={categoryRows} drilldowns={drilldowns} />
        </section>

        <SecondaryChartsTabs
          heatmapDays={heatmapDays}
          weekdayPattern={weekdayPattern}
          accountRows={accountRows.map((r) => ({ name: r.name, icon: r.icon, amount: r.amount, color: r.color }))}
        />
      </StaggerList>
    </>
  );
}
