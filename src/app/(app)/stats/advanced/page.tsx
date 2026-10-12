import { requireUserId } from "@/lib/auth";
import { hasCoreAccess } from "@/lib/entitlements";
import { LockedPreview } from "@/components/upgrade/locked-preview";
import { resolveStatsRange } from "@/lib/stats/range";
import { getIncomeExpenseTrend } from "@/lib/stats/overview-queries";
import { getNetWorthTrend } from "@/lib/stats/networth-queries";
import { getMonthComparison } from "@/lib/stats/trend-queries";
import { getPeriodHighlights, getSavingsRateTrend } from "@/lib/stats/insight-queries";
import { NetWorthTrendChart } from "@/components/stats/net-worth-trend-chart";
import { IncomeExpenseTrendChart } from "@/components/stats/income-expense-trend-chart";
import { MonthComparisonBarChart } from "@/components/stats/month-comparison-bar-chart";
import { SavingsRateTrendList } from "@/components/stats/savings-rate-card";
import { PeriodHighlightsGrid } from "@/components/stats/period-highlights";
import { StatsTabNav } from "@/components/stats/stats-tab-nav";
import { StatsRangeSwitcher } from "@/components/stats/stats-range-switcher";
import { StaggerList } from "@/components/motion/stagger-list";

// "長期上我過得好不好" — everything here is multi-period by nature, which
// is what separates it from 總覽 (this period) and 支出分析 (this period's
// composition). The highlights grid at the bottom doubles as the year in
// review once the range switcher is set to 年.
export default async function StatsAdvancedPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  // Not a redirect: free users see their own data blurred under the unlock
  // card (LockedPreview), which sells it far better than a feature list.
  const unlocked = await hasCoreAccess(userId);
  const range = resolveStatsRange(params);

  const [netWorthTrend, incomeExpenseTrend, savingsTrend, monthComparison, highlights] = await Promise.all([
    getNetWorthTrend(userId),
    getIncomeExpenseTrend(userId, range),
    getSavingsRateTrend(userId, range),
    getMonthComparison(userId, range),
    getPeriodHighlights(userId, range),
  ]);

  return (
    <>
      <StatsTabNav active="/stats/advanced" />
      <StatsRangeSwitcher basePath="/stats/advanced" range={range} />

      <LockedPreview unlocked={unlocked} from="stats-advanced" title="解鎖「趨勢」分析" points={["淨資產、收支、儲蓄率的長期走勢", "每個月跟上個月比，一眼看出變化", "年度亮點，回顧你這一年"]}>
      <StaggerList className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">淨資產趨勢</h2>
          <NetWorthTrendChart data={netWorthTrend} />
        </section>

        {/* Kept alongside 儲蓄率趨勢 rather than folded into it — both are
            built from the same two series, but "earning and spending more
            in absolute terms" and "keeping a bigger share of it" move
            independently, and only seeing the rate hides the first. */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">收支趨勢</h2>
          <IncomeExpenseTrendChart data={incomeExpenseTrend} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">儲蓄率趨勢</h2>
          <SavingsRateTrendList data={savingsTrend} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">月對月比較</h2>
          <MonthComparisonBarChart data={monthComparison} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{range.label}亮點</h2>
          <PeriodHighlightsGrid data={highlights} rangeLabel={range.label} />
        </section>
      </StaggerList>
      </LockedPreview>
    </>
  );
}
