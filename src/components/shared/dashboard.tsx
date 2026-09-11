"use client";

import { useState } from "react";
import { computeNetBalance } from "@/lib/shared-balance";
import type { SharedMonthlyPoint } from "@/lib/shared-trend";
import type { FlatSplitItem } from "@/lib/shared-expenses";
import { BalanceCard } from "@/components/shared/balance-card";
import { SharedQuickAddFlow } from "@/components/shared/quick-add-flow";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { SplitEventCard } from "@/components/shared/split-event-card";
import { PersonGroupCard } from "@/components/shared/person-group-card";
import { SharedMonthlyTrendChart } from "@/components/shared/monthly-trend-chart";
import { BearIllustration } from "@/components/bear-illustration";
import { BackLink } from "@/components/back-link";
import type { AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null };
type Account = { id: string; name: string; type: AccountType };
type ViewMode = "event" | "person";

export function SharedLedgerDashboard({
  items,
  categories,
  accounts,
  dateFrom,
  dateTo,
  monthlyTrend,
}: {
  items: FlatSplitItem[];
  categories: Category[];
  accounts: Account[];
  dateFrom?: string;
  dateTo?: string;
  monthlyTrend: SharedMonthlyPoint[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("event");

  const unsettled = items.filter((i) => !i.isSettled);
  const netBalance = computeNetBalance(unsettled);
  const owedToMe = unsettled.filter((i) => !i.iOwe).reduce((sum, i) => sum + Number(i.amount), 0);
  const iOweTotal = unsettled.filter((i) => i.iOwe).reduce((sum, i) => sum + Number(i.amount), 0);
  const isFiltered = Boolean(dateFrom || dateTo);
  const frequentSplitNames = [...new Set(items.map((i) => i.name))].slice(0, 8);

  // 依事件 view (default) — one card per split-expense event (a bill), every
  // participant of that bill shown together regardless of settled status.
  const byExpenseId = new Map<string, FlatSplitItem[]>();
  for (const item of items) {
    const list = byExpenseId.get(item.sharedExpenseId) ?? [];
    list.push(item);
    byExpenseId.set(item.sharedExpenseId, list);
  }
  const eventGroups = [...byExpenseId.values()];
  const pendingEvents = eventGroups.filter((g) => g.some((i) => !i.isSettled));
  const doneEvents = eventGroups.filter((g) => g.every((i) => i.isSettled));

  // 依對象 view — for a long-running fixed counterparty (e.g. a couple
  // settling monthly), grouping by person and netting across every one of
  // their unsettled events is what makes bulk-settling dozens/hundreds of
  // small IOUs practical. Unsettled only — this view exists to act on an
  // outstanding balance, not to browse history (that's what 依事件 is for).
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

      <div className="flex rounded-full bg-muted p-1">
        {(
          [
            ["event", "依事件"],
            ["person", "依對象"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={cn(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
              viewMode === mode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <BearIllustration name="multi-account" size={96} />
          <p className="text-sm text-muted-foreground">
            {isFiltered ? "這個區間沒有分帳支出。" : "還沒有分帳支出，新增第一筆吧！"}
          </p>
        </div>
      ) : viewMode === "event" ? (
        <>
          {pendingEvents.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                進行中（{pendingEvents.length} 個事件）
              </span>
              <div className="flex flex-col divide-y rounded-2xl border bg-card">
                {pendingEvents.map((group) => (
                  <SplitEventCard
                    key={group[0].sharedExpenseId}
                    sharedExpenseId={group[0].sharedExpenseId}
                    eventName={group[0].itemName}
                    items={group}
                    categories={categories}
                    accounts={accounts}
                  />
                ))}
              </div>
            </div>
          )}
          {doneEvents.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                已結清（{doneEvents.length} 個事件）
              </span>
              <div className="flex flex-col divide-y rounded-2xl border bg-card opacity-70">
                {doneEvents.map((group) => (
                  <SplitEventCard
                    key={group[0].sharedExpenseId}
                    sharedExpenseId={group[0].sharedExpenseId}
                    eventName={group[0].itemName}
                    items={group}
                    categories={categories}
                    accounts={accounts}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : personGroups.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            未結清・依對象（{personGroups.length}）
          </span>
          <div className="flex flex-col divide-y rounded-2xl border bg-card">
            {personGroups.map(([name, groupItems]) => (
              <PersonGroupCard
                key={name}
                name={name}
                items={groupItems}
                categories={categories}
                accounts={accounts}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <BearIllustration name="multi-account" size={96} />
          <p className="text-sm text-muted-foreground">目前沒有未結清的分帳對象。</p>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">近 6 個月分帳支出</h2>
        <SharedMonthlyTrendChart data={monthlyTrend} />
      </section>
    </div>
  );
}
