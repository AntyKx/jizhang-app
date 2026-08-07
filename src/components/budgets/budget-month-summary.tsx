import { CountUpNumber } from "@/components/motion/count-up-number";
import { cn } from "@/lib/utils";

export function BudgetMonthSummary({
  spent,
  limit,
  dayOfMonth,
  daysInMonth,
  isOverallBudget,
}: {
  spent: number;
  limit: number;
  dayOfMonth: number;
  daysInMonth: number;
  isOverallBudget: boolean;
}) {
  const spentPct = (spent / limit) * 100;
  const timePct = (dayOfMonth / daysInMonth) * 100;
  const remaining = limit - spent;
  const daysLeft = daysInMonth - dayOfMonth;
  // "On pace" means spending hasn't outrun the month — comparing the two
  // percentages is the whole point of this card, since 50% spent on day 5
  // and on day 25 mean opposite things.
  const overPace = spentPct > timePct;

  return (
    <div className="flex flex-col gap-3 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-md shadow-foreground/10">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            {remaining >= 0 ? "本月還可以花" : "本月已超支"}
          </span>
          <span
            className={cn(
              "text-3xl font-bold tracking-tight tabular-nums",
              remaining >= 0 ? "text-foreground" : "text-destructive",
            )}
          >
            NT$ <CountUpNumber value={Math.abs(remaining)} />
          </span>
        </div>
        <span className="text-right text-xs text-muted-foreground">
          還剩 {daysLeft} 天
          {daysLeft > 0 && remaining > 0 && (
            <>
              <br />
              每天約 {Math.floor(remaining / daysLeft).toLocaleString("zh-TW")}
            </>
          )}
        </span>
      </div>

      {/* Two stacked bars: spending on top, the month's own progress below,
          so "am I ahead of the calendar" is a visual comparison rather than
          mental math. */}
      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              overPace
                ? "bg-[linear-gradient(90deg,oklch(0.8_0.12_25),var(--destructive))]"
                : "bg-[linear-gradient(90deg,oklch(0.85_0.1_40),var(--primary))]",
            )}
            style={{ width: `${Math.min(100, spentPct)}%` }}
          />
        </div>
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-muted-foreground/40"
            style={{ width: `${Math.min(100, timePct)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className={cn(overPace ? "font-medium text-destructive" : "text-muted-foreground")}>
            已用 {Math.round(spentPct)}%・時間過了 {Math.round(timePct)}%
          </span>
          <span className="text-muted-foreground">
            <CountUpNumber value={spent} /> / <CountUpNumber value={limit} />
          </span>
        </div>
      </div>

      {!isOverallBudget && (
        <p className="text-xs text-muted-foreground">＊沒有設定整體預算，這裡以各分類預算加總計算</p>
      )}
    </div>
  );
}
