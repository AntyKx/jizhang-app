import { Wallet } from "lucide-react";
import { CountUpNumber } from "@/components/motion/count-up-number";

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
    <div className="flex items-center justify-between rounded-3xl bg-gradient-to-br from-secondary via-secondary/40 to-transparent p-5">
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
      <div className="flex flex-col items-end gap-3">
        {assets != null && liabilities != null && (
          <div className="flex flex-col items-end gap-0.5 text-xs">
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
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm shadow-foreground/10">
          <Wallet className="size-6" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}
