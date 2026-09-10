import { Receipt, Repeat, TrendingUp, Wallet } from "lucide-react";
import type { PeriodHighlights } from "@/lib/stats/insight-queries";

function Stat({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-muted/40 p-3.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={1.75} />
        {label}
      </span>
      <span className="truncate text-base font-bold tabular-nums">{value}</span>
      {sub && <span className="truncate text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// Same section at every range — on 月 it's a monthly recap, and switching
// the range switcher to 年 turns it into the year-in-review without needing
// a separate screen that only earns its keep one week a year.
export function PeriodHighlightsGrid({ data, rangeLabel }: { data: PeriodHighlights; rangeLabel: string }) {
  if (data.transactionCount === 0) {
    return <p className="text-muted-foreground text-sm">{rangeLabel}還沒有支出紀錄。</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat
        Icon={TrendingUp}
        label="最大單筆"
        value={data.biggest ? `$${Math.round(data.biggest.amount).toLocaleString("zh-TW")}` : "—"}
        sub={data.biggest ? `${data.biggest.label}・${data.biggest.date}` : undefined}
      />
      <Stat
        Icon={Repeat}
        label="最常消費"
        value={data.mostVisited ? data.mostVisited.name : "—"}
        sub={data.mostVisited ? `${data.mostVisited.count} 次` : "還沒填過商家"}
      />
      <Stat Icon={Receipt} label="記帳筆數" value={`${data.transactionCount} 筆`} />
      <Stat
        Icon={Wallet}
        label="平均每日支出"
        value={`$${Math.round(data.dailyAverage).toLocaleString("zh-TW")}`}
        sub="以目前已過的天數計算"
      />
    </div>
  );
}
