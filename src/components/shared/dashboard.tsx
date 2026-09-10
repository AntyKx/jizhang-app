import { computeNetBalance } from "@/lib/shared-balance";
import type { SharedMonthlyPoint } from "@/lib/shared-trend";
import type { FlatSplitItem } from "@/lib/shared-expenses";
import { BalanceCard } from "@/components/shared/balance-card";
import { AddSharedExpenseDialog } from "@/components/shared/add-expense-dialog";
import { SharedQuickAddFlow } from "@/components/shared/quick-add-flow";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { PersonGroupCard } from "@/components/shared/person-group-card";
import { SharedExpenseRow } from "@/components/shared/expense-row";
import { SharedMonthlyTrendChart } from "@/components/shared/monthly-trend-chart";
import { BearIllustration } from "@/components/bear-illustration";
import { BackLink } from "@/components/back-link";

type Category = { id: string; name: string; icon: string | null; color: string | null };

export function SharedLedgerDashboard({
  items,
  categories,
  dateFrom,
  dateTo,
  monthlyTrend,
}: {
  items: FlatSplitItem[];
  categories: Category[];
  dateFrom?: string;
  dateTo?: string;
  monthlyTrend: SharedMonthlyPoint[];
}) {
  const unsettled = items.filter((i) => !i.isSettled);
  const settled = items.filter((i) => i.isSettled);
  const netBalance = computeNetBalance(unsettled);
  const owedToMe = unsettled.filter((i) => !i.iOwe).reduce((sum, i) => sum + Number(i.amount), 0);
  const iOweTotal = unsettled.filter((i) => i.iOwe).reduce((sum, i) => sum + Number(i.amount), 0);
  const isFiltered = Boolean(dateFrom || dateTo);
  const frequentSplitNames = [...new Set(items.map((i) => i.name))].slice(0, 8);

  // Group unsettled items by counterparty name — this is the whole point of
  // the redesign away from a single fixed partner: whoever appears most in
  // your recent history naturally sorts first here, no separate "favorite"
  // concept needed.
  const unsettledByName = new Map<string, FlatSplitItem[]>();
  for (const item of unsettled) {
    const list = unsettledByName.get(item.name) ?? [];
    list.push(item);
    unsettledByName.set(item.name, list);
  }
  const personGroups = [...unsettledByName.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/more" label="更多功能" />
      <h1 className="text-2xl font-semibold">分帳</h1>

      <DateRangeFilter from={dateFrom} to={dateTo} />

      <BalanceCard
        netBalance={netBalance}
        owedToMe={owedToMe}
        iOweTotal={iOweTotal}
        hasUnsettled={unsettled.length > 0}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      <SharedQuickAddFlow categories={categories} frequentSplitNames={frequentSplitNames} />

      <AddSharedExpenseDialog categories={categories} frequentSplitNames={frequentSplitNames} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <BearIllustration name="multi-account" size={96} />
          <p className="text-sm text-muted-foreground">
            {isFiltered ? "這個區間沒有分帳支出。" : "還沒有分帳支出，新增第一筆吧！"}
          </p>
        </div>
      ) : (
        <>
          {personGroups.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                未結清・依對象（{unsettled.length}）
              </span>
              <div className="flex flex-col gap-2">
                {personGroups.map(([name, groupItems]) => (
                  <PersonGroupCard
                    key={name}
                    name={name}
                    items={groupItems}
                    categories={categories}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                  />
                ))}
              </div>
            </div>
          )}
          {settled.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                已結清（{settled.length}）
              </span>
              <div className="flex flex-col divide-y rounded-2xl border bg-card opacity-70">
                {/* Rendered flat (not grouped) — settled history is for
                    lookup/audit, not for acting on, so there's no benefit to
                    the same per-person grouping unsettled items get. */}
                {settled.map((item) => (
                  <SharedExpenseRow key={`${item.sharedExpenseId}-${item.participantIndex}`} item={item} categories={categories} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">近 6 個月分帳支出</h2>
        <SharedMonthlyTrendChart data={monthlyTrend} />
      </section>
    </div>
  );
}
