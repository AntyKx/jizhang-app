import { requireUserId } from "@/lib/auth";
import { resolveStatsRange } from "@/lib/stats/range";
import { getAccountBreakdown, getCategoryBreakdown, getCategoryDrilldowns } from "@/lib/stats/category-queries";
import { getFixedVsVariable, getTopMerchants } from "@/lib/stats/insight-queries";
import { CategoryBreakdownPanel } from "@/components/stats/category-breakdown-panel";
import { CategoryBreakdown } from "@/components/stats/category-breakdown";
import { TopMerchantsList } from "@/components/stats/top-merchants-list";
import { FixedVsVariableCard } from "@/components/stats/fixed-vs-variable-card";
import { StatsTabNav } from "@/components/stats/stats-tab-nav";
import { StatsRangeSwitcher } from "@/components/stats/stats-range-switcher";
import { StaggerList } from "@/components/motion/stagger-list";

// "錢花去哪" — ordered widest-lens-first: category, then the merchants
// inside those categories, then the fixed/variable split that says how much
// of it was even up for debate, then which account it came out of.
export default async function StatsDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const range = resolveStatsRange(params);

  const [categoryRows, accountRows, drilldowns, merchants, fixedVsVariable] = await Promise.all([
    getCategoryBreakdown(userId, range, "expense"),
    getAccountBreakdown(userId, range),
    getCategoryDrilldowns(userId, range),
    getTopMerchants(userId, range),
    getFixedVsVariable(userId, range),
  ]);

  return (
    <>
      <StatsTabNav active="/stats/daily" />
      <StatsRangeSwitcher basePath="/stats/daily" range={range} />

      <StaggerList className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">支出分類</h2>
          <CategoryBreakdownPanel rows={categoryRows} drilldowns={drilldowns} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">商家排行</h2>
          <TopMerchantsList rows={merchants} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">固定 vs 變動支出</h2>
          <FixedVsVariableCard data={fixedVsVariable} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">帳戶分布</h2>
          <CategoryBreakdown
            rows={accountRows.map((r) => ({ name: r.name, icon: r.icon, amount: r.amount, color: r.color }))}
          />
        </section>
      </StaggerList>
    </>
  );
}
