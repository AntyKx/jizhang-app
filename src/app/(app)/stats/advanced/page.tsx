import { requireUserId } from "@/lib/auth";
import { requireCoreAccess } from "@/lib/entitlements";
import { resolveStatsRange } from "@/lib/stats/range";
import { getCumulativeSpending } from "@/lib/stats/overview-queries";
import { getNetWorthTrend } from "@/lib/stats/networth-queries";
import { getCashFlowSankey } from "@/lib/stats/cashflow-queries";
import { getMonthComparison } from "@/lib/stats/trend-queries";
import { getCategoryShareTrend } from "@/lib/stats/category-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetWorthTrendChart } from "@/components/stats/net-worth-trend-chart";
import { CashFlowSankeyChart } from "@/components/stats/cash-flow-sankey-chart";
import { CumulativeSpendChart } from "@/components/stats/cumulative-spend-chart";
import { MonthComparisonBarChart } from "@/components/stats/month-comparison-bar-chart";
import { CategoryShareAreaChart } from "@/components/stats/category-share-area-chart";
import { StatsTabNav } from "@/components/stats/stats-tab-nav";
import { StatsRangeSwitcher } from "@/components/stats/stats-range-switcher";
import { StaggerList } from "@/components/motion/stagger-list";

export default async function StatsAdvancedPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "stats-advanced");
  const params = await searchParams;
  const range = resolveStatsRange(params);

  const [netWorthTrend, cashFlow, cumulative, monthComparison, shareTrend] = await Promise.all([
    getNetWorthTrend(userId),
    getCashFlowSankey(userId, range),
    getCumulativeSpending(userId, range),
    getMonthComparison(userId, range),
    getCategoryShareTrend(userId, range),
  ]);

  return (
    <>
      <StatsTabNav active="/stats/advanced" />
      <StatsRangeSwitcher basePath="/stats/advanced" range={range} />

      <StaggerList className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>淨資產趨勢</CardTitle>
          </CardHeader>
          <CardContent>
            <NetWorthTrendChart data={netWorthTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>金流圖</CardTitle>
          </CardHeader>
          <CardContent>
            <CashFlowSankeyChart data={cashFlow} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>累積支出</CardTitle>
          </CardHeader>
          <CardContent>
            <CumulativeSpendChart data={cumulative} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>月對月比較</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthComparisonBarChart data={monthComparison} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>分類佔比趨勢（近 6 個月）</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryShareAreaChart trend={shareTrend} />
          </CardContent>
        </Card>
      </StaggerList>
    </>
  );
}
