import { cn } from "@/lib/utils";
import type { SavingsRatePoint } from "@/lib/stats/insight-queries";

// Bands are deliberately coarse — this is a "which direction am I heading"
// read, not a score. 20% is the commonly cited healthy floor, and anything
// negative means the period ran at a loss, which deserves its own colour
// rather than being lumped in with "low but positive".
function toneFor(rate: number): string {
  if (rate < 0) return "text-destructive";
  if (rate < 10) return "text-amber-600";
  return "text-emerald-600";
}

export function SavingsRateCard({
  income,
  expense,
  rate,
  previousRate,
}: {
  income: number;
  expense: number;
  rate: number | null;
  previousRate: number | null;
}) {
  if (rate === null) {
    return (
      <div className="flex flex-col gap-1 rounded-3xl bg-muted/40 p-5">
        <span className="text-sm text-muted-foreground">儲蓄率</span>
        <span className="text-sm text-muted-foreground">這段期間沒有收入紀錄，算不出儲蓄率。</span>
      </div>
    );
  }

  const rounded = Math.round(rate);
  const delta = previousRate === null ? null : Math.round(rate - previousRate);

  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-muted/40 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">儲蓄率</span>
        {delta !== null && delta !== 0 && (
          <span className={cn("text-xs font-medium tabular-nums", delta > 0 ? "text-emerald-600" : "text-destructive")}>
            {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}% 較上期
          </span>
        )}
      </div>
      <span className={cn("text-3xl font-bold tabular-nums", toneFor(rate))}>{rounded}%</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        收入 {Math.round(income).toLocaleString("zh-TW")}・支出 {Math.round(expense).toLocaleString("zh-TW")}
        ・存下 {Math.round(income - expense).toLocaleString("zh-TW")}
      </span>
    </div>
  );
}

export function SavingsRateTrendList({ data }: { data: SavingsRatePoint[] }) {
  const withRate = data.filter((d) => d.rate !== null);
  if (withRate.length === 0) {
    return <p className="text-muted-foreground text-sm">還沒有足夠的收入紀錄可以看儲蓄率趨勢。</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => {
        // Bar width is share-of-100%, clamped — a 120% savings rate (paid
        // back a loan, say) shouldn't blow the row's width out, and a
        // negative one reads as an empty bar plus the red number.
        const width = d.rate === null ? 0 : Math.max(0, Math.min(d.rate, 100));
        return (
          <div key={d.bucketKey} className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-xs text-muted-foreground">{d.bucketLabel}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", d.rate !== null && d.rate < 0 ? "bg-destructive" : "bg-emerald-500")}
                style={{ width: `${d.rate !== null && d.rate < 0 ? 100 : width}%` }}
              />
            </div>
            <span
              className={cn(
                "w-12 shrink-0 text-right text-xs font-semibold tabular-nums",
                d.rate === null ? "text-muted-foreground" : toneFor(d.rate),
              )}
            >
              {d.rate === null ? "—" : `${Math.round(d.rate)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
