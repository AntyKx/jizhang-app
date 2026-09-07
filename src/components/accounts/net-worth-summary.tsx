import { Wallet } from "lucide-react";
import { CountUpNumber } from "@/components/motion/count-up-number";

export function NetWorthSummary({
  total,
  accountCount,
}: {
  total: number | null;
  accountCount: number;
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
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm shadow-foreground/10">
        <Wallet className="size-6" strokeWidth={1.75} />
      </span>
    </div>
  );
}
