import { INCOME_COLOR, SLOT_1_COLOR } from "@/components/stats/chart-colors";
import type { FixedVsVariable } from "@/lib/stats/insight-queries";

// Split comes from whether the expense was posted by a recurring rule, so
// the empty state is a real instruction ("set your recurring bills up and
// this becomes meaningful"), not just "no data".
export function FixedVsVariableCard({ data }: { data: FixedVsVariable }) {
  const total = data.fixed + data.variable;
  if (total === 0) {
    return <p className="text-muted-foreground text-sm">這段期間還沒有支出紀錄。</p>;
  }

  const fixedPct = data.fixedPct ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div style={{ width: `${fixedPct}%`, backgroundColor: SLOT_1_COLOR }} />
        <div style={{ width: `${100 - fixedPct}%`, backgroundColor: INCOME_COLOR }} />
      </div>

      <div className="flex flex-col divide-y">
        <div className="flex items-center justify-between py-2">
          <span className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: SLOT_1_COLOR }} />
            固定支出
            <span className="text-xs text-muted-foreground">訂閱・定期帳單</span>
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {Math.round(data.fixed).toLocaleString("zh-TW")}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{Math.round(fixedPct)}%</span>
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
            變動支出
            <span className="text-xs text-muted-foreground">可調整的部分</span>
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {Math.round(data.variable).toLocaleString("zh-TW")}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{Math.round(100 - fixedPct)}%</span>
          </span>
        </div>
      </div>

      {data.fixed === 0 && (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          還沒有「訂閱／定期收支」紀錄，暫時全算變動支出。把房租、保險等設成定期項目就能看出固定開銷。
        </p>
      )}
    </div>
  );
}
