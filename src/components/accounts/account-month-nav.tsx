import Link from "next/link";
import type { StatsRange } from "@/lib/stats/range";

// Same prev/label/next shape as StatsRangeSwitcher's bottom row, minus the
// week/year unit toggle — an account's detail view only ever makes sense
// browsed month by month, so there's no unit to switch.
export function AccountMonthNav({ basePath, range }: { basePath: string; range: StatsRange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={`${basePath}?${range.prevQuery}`} className="rounded-full px-2 py-1 text-sm hover:bg-muted">
        ← 上一月
      </Link>
      <Link
        href={`${basePath}?${range.todayQuery}`}
        className="min-w-0 flex-1 truncate text-center text-sm font-medium"
      >
        {range.label}
      </Link>
      <Link href={`${basePath}?${range.nextQuery}`} className="rounded-full px-2 py-1 text-sm hover:bg-muted">
        下一月 →
      </Link>
    </div>
  );
}
