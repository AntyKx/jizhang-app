"use client";

import Image from "next/image";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { getNowInTaipei } from "@/lib/date";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function getGreeting(hour: number): string {
  if (hour < 5) return "夜深了";
  if (hour < 12) return "早安";
  if (hour < 18) return "午安";
  return "晚安";
}

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
    <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card shadow-md shadow-foreground/10">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-semibold">
            {greeting}
            {userName ? `，${userName}` : ""}
          </span>
          <span className="text-xs text-muted-foreground">{dateLabel}</span>
          <span className="mt-1 text-sm text-muted-foreground">
            {overBudget ? "這個月支出有點超過囉，一起看看吧" : "今天也一起管理好錢包吧！"}
          </span>
        </div>

        {/* Reserve room on the right so the bottom-right bear sticker (see
            below) never overlaps the right-aligned amounts. The greeting
            block above is clear of the sticker's shorter footprint, so it
            keeps the full card width for wrapping. */}
        <div className="flex flex-col gap-1.5 pr-[43%]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">今日支出</span>
            <span className="font-semibold text-destructive tabular-nums">
              NT$ {Math.round(todayExpense).toLocaleString("zh-TW")}
            </span>
          </div>

          {budgetLimit != null && budgetPct != null && remaining != null && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">本月剩餘</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    overBudget && "text-destructive",
                  )}
                >
                  NT$ {Math.round(remaining).toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={budgetPct} className="flex-1" />
                <span className="w-9 text-right text-xs text-muted-foreground">
                  {Math.round(budgetPct)}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* object-fit crops against the actual file's pixel ratio (640x640,
          exactly 1:1) — not the illustration's visually-trimmed content
          bounding box, which is landscape but isn't what cover/contain see.
          aspect-square matches the file exactly, so nothing gets cropped;
          floating this absolutely instead of stretching to the card's
          height is what avoids the blank space above it. */}
      <div className="absolute right-0 bottom-0 aspect-square w-[43%]">
        <Image
          src={overBudget ? "/images/bears/bear-over-budget.webp" : "/images/bears/bear-record.webp"}
          alt=""
          fill
          sizes="150px"
          className="object-cover object-bottom"
        />
      </div>
    </div>
  );
}
