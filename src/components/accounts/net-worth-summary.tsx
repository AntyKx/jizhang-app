import { CountUpNumber } from "@/components/motion/count-up-number";

// Full-bleed banner (-mx-4 cancels (app)/layout.tsx's <main> px-4) — same
// language as the home page's top summary, minus the safe-area handling
// since this one sits below the page's own title row rather than at the
// true screen top.
export function NetWorthSummary({
  total,
  accountCount,
  assets,
  liabilities,
}: {
  total: number | null;
  accountCount: number;
  // TWD-converted (same exchange rates as `total`) sums of positive and
  // negative currentBalance across net-worth-counted accounts — null in
  // lockstep with `total` when a rate lookup failed.
  assets: number | null;
  liabilities: number | null;
}) {
  return (
    <div className="relative -mx-4 overflow-hidden rounded-b-[28px] bg-gradient-to-br from-secondary via-secondary/45 to-transparent">
      <div className="absolute -top-16 -right-8 size-[150px] rounded-full bg-[color-mix(in_oklch,var(--secondary)_70%,transparent)]" />

      <div className="relative flex items-end justify-between gap-4 px-5 pt-5 pb-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">總資產</span>
          {total === null ? (
            <span className="text-sm text-muted-foreground">目前無法換算外幣，請稍後再試</span>
          ) : (
            <span className="text-3xl font-bold tracking-tight tabular-nums">
              NT$ <CountUpNumber value={total} />
            </span>
          )}
          <span className="text-xs text-muted-foreground">共 {accountCount} 個帳戶</span>
        </div>
        {assets != null && liabilities != null && (
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
            <span className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground">資產</span>
              <span className="font-semibold tabular-nums">{Math.round(assets).toLocaleString("zh-TW")}</span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground">負債</span>
              <span className="font-semibold tabular-nums text-destructive">
                {Math.round(liabilities).toLocaleString("zh-TW")}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
