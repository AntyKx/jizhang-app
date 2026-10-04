"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { TransactionsList } from "@/components/transactions/transactions-list";
import type { Account, AccountInfo, Category, ListItem } from "@/lib/transactions/list-types";
import { AccountYearChart, type AccountMonthPoint } from "@/components/accounts/account-year-chart";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "overview", label: "總覽" },
  { key: "detail", label: "明細" },
] as const;

export function AccountDetailTabs({
  accountId,
  periodLabel,
  monthlyBreakdown,
  currentBalance,
  currency,
  periodIncome,
  periodExpense,
  listItems,
  categories,
  accounts,
  accountsById,
  frequentSplitNames,
}: {
  accountId: string;
  periodLabel: string;
  // Non-null only in year view.
  monthlyBreakdown: AccountMonthPoint[] | null;
  currentBalance: string;
  currency: string;
  periodIncome: number;
  periodExpense: number;
  listItems: ListItem[];
  categories: Category[];
  accounts: Account[];
  accountsById: Record<string, AccountInfo>;
  frequentSplitNames: string[];
}) {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("overview");
  const containerRef = useRef<HTMLDivElement>(null);

  const net = periodIncome - periodExpense;

  return (
    <div className="flex flex-col gap-4">
      <div ref={containerRef} className="relative isolate flex w-fit items-center gap-[3px] rounded-lg bg-muted p-[3px]">
        <SlidingIndicator activeKey={active} containerRef={containerRef} className="-z-10 rounded-md bg-background shadow-sm" />
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            data-key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === t.key ? "text-foreground" : "text-foreground/60 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "overview" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-3xl bg-muted/40 p-5">
            <span className="text-muted-foreground text-sm">目前餘額</span>
            <span className="text-3xl font-semibold tabular-nums">
              {currency !== "TWD" && <span className="mr-1 text-base font-normal text-muted-foreground">{currency}</span>}
              {Number(currentBalance).toLocaleString("zh-TW")}
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl bg-muted/40 p-5">
            <span className="text-muted-foreground text-sm">{periodLabel}收支</span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">收入</span>
                <span className="font-semibold tabular-nums text-emerald-600">
                  {periodIncome.toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">支出</span>
                <span className="font-semibold tabular-nums text-destructive">
                  {periodExpense.toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">淨額</span>
                <span className={cn("font-semibold tabular-nums", net >= 0 ? "text-emerald-600" : "text-destructive")}>
                  {net >= 0 ? "+" : ""}
                  {net.toLocaleString("zh-TW")}
                </span>
              </div>
            </div>
          </div>

          {monthlyBreakdown && (
            <>
              <div className="flex flex-col gap-3 rounded-3xl bg-muted/40 p-5">
                <span className="text-muted-foreground text-sm">每月收支</span>
                <AccountYearChart data={monthlyBreakdown} />
              </div>

              <div className="flex flex-col rounded-3xl bg-muted/40 px-5 py-3">
                <span className="text-muted-foreground py-2 text-sm">各月明細</span>
                <div className="flex flex-col divide-y">
                  {monthlyBreakdown
                    .filter((m) => !m.isFuture)
                    .reverse()
                    .map((m) => (
                      <Link
                        key={m.monthKey}
                        href={`/accounts/${accountId}?date=${m.monthKey}-01`}
                        className="grid grid-cols-[3rem_1fr_1fr_1rem] items-center gap-2 py-2.5 text-sm"
                      >
                        <span className="font-medium">{m.monthLabel.replace("月", " 月")}</span>
                        <span className="text-right tabular-nums text-muted-foreground">
                          收 {m.income.toLocaleString("zh-TW")}
                        </span>
                        <span className="text-right tabular-nums text-destructive">
                          支 {m.expense.toLocaleString("zh-TW")}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <TransactionsList
          items={listItems}
          categories={categories}
          accounts={accounts}
          accountsById={accountsById}
          initialCursor={null}
          frequentSplitNames={frequentSplitNames}
          collapsibleMonths={monthlyBreakdown !== null}
        />
      )}
    </div>
  );
}
