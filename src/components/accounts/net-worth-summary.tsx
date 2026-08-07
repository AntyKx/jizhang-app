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
    <div className="flex items-center justify-between rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-md shadow-foreground/10">
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
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Wallet className="size-6" strokeWidth={1.75} />
      </span>
    </div>
  );
}
