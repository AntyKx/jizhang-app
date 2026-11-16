"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { signedAmount } from "@/lib/transactions/signed-amount";
import { TodayTransactionRow, type TodayTransaction } from "@/components/record/today-transaction-row";
import { SettlementGroupRow } from "@/components/transactions/settlement-group-row";
import { TransferRow } from "@/components/transactions/transactions-list";
import { groupSettlements, isSettlementGroup } from "@/lib/transactions/group-settlements";
import { BearIllustration } from "@/components/bear-illustration";
import { heatmapLevel, SEQUENTIAL_HEATMAP_STEPS, SEQUENTIAL_HEATMAP_TEXT } from "@/components/stats/chart-colors";
import { StaggerList } from "@/components/motion/stagger-list";
import { CalendarScrollPane } from "@/components/calendar/calendar-scroll-pane";
import type { Account, AccountInfo, Category, TransferListItem } from "@/lib/transactions/list-types";
import { cn } from "@/lib/utils";

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

// A month row as the page queries it: either an income/expense row (edited
// through TodayTransactionRow) or a transfer / 餘額校正 (TransferRow).
export type CalendarTransaction =
  | (TodayTransaction & { kind: "transaction" })
  | (TransferListItem & { exchangeRate: string; createdAt: Date });

// The month grid plus the selected day's list. The page hands over the whole
// month once; picking a day only swaps which rows are shown, so it's instant
// instead of a server round trip per tap (it used to be a <Link> that
// re-queried the whole month for every day). The picked day still lives in
// the URL (?day=) via history.replaceState — Next keeps useSearchParams in
// sync with that — because the global "+" button reads it to default a new
// entry's date, and a router.refresh() after an edit has to land on the same
// day.
export function CalendarView({
  monthKey,
  monthLabel,
  prevMonthKey,
  nextMonthKey,
  todayKey,
  defaultDay,
  days,
  leadingBlanks,
  transactions,
  categories,
  accounts,
  accountsById,
  showAccount,
  frequentSplitNames,
}: {
  monthKey: string;
  monthLabel: string;
  prevMonthKey: string;
  nextMonthKey: string;
  todayKey: string;
  // Today when the month on screen is the current one, otherwise null.
  defaultDay: string | null;
  days: { key: string; label: string }[];
  leadingBlanks: number;
  transactions: CalendarTransaction[];
  categories: Category[];
  accounts: Account[];
  accountsById: Record<string, AccountInfo>;
  showAccount: boolean;
  frequentSplitNames: string[];
}) {
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  // A ?day= left over from another month (mid-navigation) isn't in this grid.
  const selectedDay = dayParam && dayParam.startsWith(monthKey) ? dayParam : defaultDay;

  function selectDay(key: string) {
    window.history.replaceState(null, "", `/calendar?month=${monthKey}&day=${key}`);
  }

  const { byDay, monthIncome, monthExpense, maxExpense } = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type !== "income" && t.type !== "expense") continue;
      const entry = map.get(t.occurredAt) ?? { income: 0, expense: 0 };
      const amount = Number(t.amount) * Number(t.exchangeRate);
      if (t.type === "income") {
        entry.income += amount;
        income += amount;
      } else {
        entry.expense += amount;
        expense += amount;
      }
      map.set(t.occurredAt, entry);
    }
    return {
      byDay: map,
      monthIncome: income,
      monthExpense: expense,
      maxExpense: Math.max(0, ...[...map.values()].map((e) => e.expense)),
    };
  }, [transactions]);

  const selectedTransactions = selectedDay ? transactions.filter((t) => t.occurredAt === selectedDay) : [];
  const editableTransactions = selectedTransactions.filter(
    (t): t is TodayTransaction & { kind: "transaction" } => t.kind === "transaction",
  );
  const transferTransactions = selectedTransactions.filter(
    (t): t is TransferListItem & { exchangeRate: string; createdAt: Date } => t.kind === "transfer",
  );

  const header = (
    <div className="flex flex-col gap-2 pb-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?month=${prevMonthKey}`}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="上個月"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-xl font-semibold">{monthLabel}</h1>
          {/* The heat colours only say "more" or "less" — the month's actual
              totals weren't anywhere on this page. */}
          <div className="flex gap-3 text-xs tabular-nums">
            <span className="text-muted-foreground">
              支出 <span className="font-semibold text-destructive">{Math.round(monthExpense).toLocaleString("zh-TW")}</span>
            </span>
            <span className="text-muted-foreground">
              收入 <span className="font-semibold text-income">{Math.round(monthIncome).toLocaleString("zh-TW")}</span>
            </span>
          </div>
        </div>
        <Link
          href={`/calendar?month=${nextMonthKey}`}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="下個月"
        >
          <ChevronRight className="size-5" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekdays.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        {/* Plain div, not StaggerList — a 30+ cell month grid is functional
            content (every day needs to stay tappable), not a decorative
            list. StaggerList's GSAP entrance animates from opacity:0, and
            if that tween ever gets interrupted/throttled (backgrounded
            tab, low-power mode) before finishing, whatever cells hadn't
            animated in yet are stuck permanently invisible — which is
            exactly the "later days don't show up" bug this replaces. */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((d) => {
            const entry = byDay.get(d.key);
            const isSelected = selectedDay === d.key;
            const isToday = d.key === todayKey;
            const level = heatmapLevel(entry?.expense ?? 0, maxExpense);
            const textColor = SEQUENTIAL_HEATMAP_TEXT[level];
            const titleParts = [
              entry?.expense ? `支出 ${Math.round(entry.expense).toLocaleString("zh-TW")}` : null,
              entry?.income ? `收入 ${Math.round(entry.income).toLocaleString("zh-TW")}` : null,
            ].filter(Boolean);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => selectDay(d.key)}
                aria-pressed={isSelected}
                title={titleParts.length > 0 ? `${d.key}・${titleParts.join("・")}` : d.key}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-center tabular-nums transition-all",
                  isSelected
                    ? "z-10 scale-105 shadow-md ring-2 ring-primary ring-offset-2 ring-offset-card"
                    : "hover:ring-1 hover:ring-muted-foreground/30",
                )}
                style={{ backgroundColor: SEQUENTIAL_HEATMAP_STEPS[level], color: textColor }}
              >
                <span className={cn("text-xs", level >= 3 && "font-medium")}>{d.label}</span>
                {/* "Today" no longer relies on a ring (that's the isSelected
                    signal now) — a small dot in the day's own text color
                    stays visible no matter how intense that day's heat
                    color is. */}
                {isToday && <span className="size-1 rounded-full" style={{ backgroundColor: textColor }} />}
                {entry?.income ? <span className="absolute top-1 right-1 size-1.5 rounded-full bg-income" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Split so CalendarScrollPane can pin dateRow in place the same way it
  // already pins the month grid — only the actual transaction list should
  // scroll, not the date/amount line above it.
  const dayTotals = selectedDay ? byDay.get(selectedDay) : undefined;
  const dateRow = selectedDay && (
    <div className="flex items-center justify-between pb-2">
      <span className="text-sm font-medium text-muted-foreground">{selectedDay}</span>
      {dayTotals && (dayTotals.expense !== 0 || dayTotals.income !== 0) && (
        <div className="flex gap-3 text-sm font-semibold tabular-nums">
          {dayTotals.expense > 0 && (
            <span className="text-destructive">-{Math.round(dayTotals.expense).toLocaleString("zh-TW")}</span>
          )}
          {dayTotals.income > 0 && (
            <span className="text-income">+{Math.round(dayTotals.income).toLocaleString("zh-TW")}</span>
          )}
        </div>
      )}
    </div>
  );

  const list =
    selectedDay &&
    (selectedTransactions.length === 0 ? (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <BearIllustration name="empty" size={96} />
        <p className="text-muted-foreground text-sm">這天還沒有記帳紀錄喔！</p>
      </div>
    ) : (
      // Keyed by day so each day's rows get their own entrance instead of
      // StaggerList reusing the previous day's already-shown nodes.
      <div key={selectedDay} className="flex flex-col divide-y">
        {editableTransactions.length > 0 && (
          <StaggerList className="flex flex-col divide-y">
            {groupSettlements(editableTransactions).map((node) =>
              isSettlementGroup(node) ? (
                <SettlementGroupRow
                  key={node.groupId}
                  label={node.label}
                  total={node.items.reduce((sum, t) => sum + signedAmount(t), 0)}
                  count={node.items.length}
                  categoryIcon={node.items[0].categoryIcon}
                  categoryColor={node.items[0].categoryColor}
                >
                  {node.items.map((t) => (
                    <TodayTransactionRow
                      key={t.id}
                      transaction={t}
                      categories={categories}
                      accounts={accounts}
                      showAccount={showAccount}
                      frequentSplitNames={frequentSplitNames}
                    />
                  ))}
                </SettlementGroupRow>
              ) : (
                <TodayTransactionRow
                  key={node.id}
                  transaction={node}
                  categories={categories}
                  accounts={accounts}
                  showAccount={showAccount}
                  frequentSplitNames={frequentSplitNames}
                />
              ),
            )}
          </StaggerList>
        )}

        {/* Transfers and 餘額校正 — the same row every other list uses, so
            they show which accounts were involved and can be deleted here.
            (They used to be a bare "轉帳 + amount" line, and a 餘額校正
            didn't render at all.) */}
        {transferTransactions.length > 0 && (
          <StaggerList className="flex flex-col divide-y">
            {transferTransactions.map((t) => (
              <TransferRow key={t.id} item={t} accountsById={accountsById} />
            ))}
          </StaggerList>
        )}
      </div>
    ));

  return <CalendarScrollPane header={header} dateRow={dateRow} list={list} />;
}
