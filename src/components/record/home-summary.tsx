"use client";

import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { getNowInTaipei } from "@/lib/date";
import { Progress } from "@/components/ui/progress";
import { BearLogoMark } from "@/components/bear-logo-mark";
import { cn } from "@/lib/utils";

function getGreeting(hour: number): string {
  if (hour < 5) return "夜深了";
  if (hour < 12) return "早安";
  if (hour < 18) return "午安";
  return "晚安";
}

// Full-bleed banner — the -mx-4 -mt-6 cancels (app)/layout.tsx's <main>
// px-4 py-6 so this touches the screen's real edges instead of sitting
// inset like every other section, then rounds off only its bottom corners
// so the rest of the page can flow directly underneath it with no card
// boundary of its own (see quick-add-section.tsx / today-transactions-section.tsx).
export function HomeSummary({
  userName,
  todayExpense,
  monthExpense,
  budgetLimit,
}: {
  userName: string | null;
  todayExpense: number;
  monthExpense: number;
  budgetLimit: number | null;
}) {
  const now = getNowInTaipei();
  const greeting = getGreeting(now.getHours());
  const dateLabel = `${format(now, "M月d日", { locale: zhTW })}・${format(now, "EEEE", { locale: zhTW })}`;
  const budgetPct = budgetLimit ? Math.min(100, (monthExpense / budgetLimit) * 100) : null;
  const remaining = budgetLimit != null ? budgetLimit - monthExpense : null;
  const overBudget = remaining != null && remaining < 0;

  return (
    <div className="relative -mx-4 -mt-6 overflow-hidden rounded-b-[28px] bg-gradient-to-br from-secondary via-secondary/45 to-transparent">
      <div className="absolute -top-20 -right-8 size-[150px] rounded-full bg-[color-mix(in_oklch,var(--secondary)_70%,transparent)]" />

      <div className="relative flex flex-col gap-4 px-5 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5 pt-0.5">
            <span className="text-sm font-bold">
              {greeting}
              {userName ? `，${userName}` : ""}
            </span>
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card shadow-sm shadow-foreground/10">
            <BearLogoMark className="size-[30px]" />
          </span>
        </div>

        <div className="flex items-stretch">
          <div className="flex-1">
            <span className="text-[10.5px] text-muted-foreground">今日支出</span>
            <div
              className={cn(
                "mt-0.5 text-[22px] font-semibold tabular-nums",
                todayExpense > 0 ? "text-destructive" : "text-foreground",
              )}
            >
              NT$ {Math.round(todayExpense).toLocaleString("zh-TW")}
            </div>
          </div>
          <div className="mx-4 w-px bg-border" />
          <div className="flex-1">
            <span className="text-[10.5px] text-muted-foreground">本月支出</span>
            <div className="mt-0.5 text-[22px] font-semibold tabular-nums">
              NT$ {Math.round(monthExpense).toLocaleString("zh-TW")}
            </div>
          </div>
        </div>

        {budgetLimit != null && budgetPct != null && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">本月預算</span>
              <span className={cn("font-semibold", overBudget ? "text-destructive" : "text-primary")}>
                {overBudget
                  ? `已超支 NT$${Math.round(-remaining!).toLocaleString("zh-TW")}`
                  : `預算 ${Math.round(budgetPct)}%`}
              </span>
            </div>
            <Progress value={budgetPct} />
          </div>
        )}
      </div>
    </div>
  );
}
