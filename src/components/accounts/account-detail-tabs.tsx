"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { TransactionsList } from "@/components/transactions/transactions-list";
import type { Account, AccountInfo, Category, ListItem } from "@/lib/transactions/list-types";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "overview", label: "總覽" },
  { key: "detail", label: "明細" },
] as const;

export function AccountDetailTabs({
  monthLabel,
  currentBalance,
  currency,
  monthIncome,
  monthExpense,
  listItems,
  categories,
  accounts,
  accountsById,
  partnerName,
}: {
  monthLabel: string;
  currentBalance: string;
  currency: string;
  monthIncome: number;
  monthExpense: number;
  listItems: ListItem[];
  categories: Category[];
  accounts: Account[];
  accountsById: Record<string, AccountInfo>;
  partnerName: string;
}) {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("overview");
  const containerRef = useRef<HTMLDivElement>(null);

  const net = monthIncome - monthExpense;

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
          <Card>
            <CardContent className="flex flex-col gap-1 pt-6">
              <span className="text-muted-foreground text-sm">目前餘額</span>
              <span className="text-3xl font-semibold tabular-nums">
                {currency !== "TWD" && <span className="mr-1 text-base font-normal text-muted-foreground">{currency}</span>}
                {Number(currentBalance).toLocaleString("zh-TW")}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <span className="text-muted-foreground text-sm">{monthLabel}收支</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">收入</span>
                  <span className="font-semibold tabular-nums text-emerald-600">
                    {monthIncome.toLocaleString("zh-TW")}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">支出</span>
                  <span className="font-semibold tabular-nums text-destructive">
                    {monthExpense.toLocaleString("zh-TW")}
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
            </CardContent>
          </Card>
        </div>
      ) : (
        <TransactionsList
          items={listItems}
          categories={categories}
          accounts={accounts}
          accountsById={accountsById}
          initialCursor={null}
          partnerName={partnerName}
        />
      )}
    </div>
  );
}
