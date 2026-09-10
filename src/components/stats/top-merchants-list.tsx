import { CollapsibleProgressList } from "@/components/stats/collapsible-progress-list";
import type { MerchantRow } from "@/lib/stats/insight-queries";

export function TopMerchantsList({ rows }: { rows: MerchantRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        這段期間的支出還沒有填商家或備註，所以排不出榜。記帳時順手填一下商家，這裡就會告訴你錢實際流去哪幾家。
      </p>
    );
  }

  const max = rows[0].amount;

  return (
    <CollapsibleProgressList
      gapClassName="gap-3"
      items={rows.map((r, i) => ({
        key: r.name,
        node: (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="truncate text-sm font-medium">{r.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.count} 筆</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {Math.round(r.amount).toLocaleString("zh-TW")}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${max > 0 ? (r.amount / max) * 100 : 0}%` }}
              />
            </div>
          </div>
        ),
      }))}
    />
  );
}
