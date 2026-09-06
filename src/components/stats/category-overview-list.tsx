"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CategoryIconBadge } from "@/components/category-icon";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { CategorySlice } from "@/lib/stats/category-queries";

type Row = CategorySlice;

const VISIBLE_COUNT = 6;

function CategoryOverviewRow({ row, href }: { row: Row; href: string }) {
  return (
    <Link
      href={href}
      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
    >
      <CategoryIconBadge icon={row.icon} color={row.color} className="h-9 w-9" iconClassName="h-4 w-4" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate">{row.name}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {Math.round(row.amount).toLocaleString("zh-TW")}（{Math.round(row.pct)}%）
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(4, row.pct)}%`, backgroundColor: row.color }}
          />
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </Link>
  );
}

// Every expense category for the selected period (not just the biggest
// one) — tapping a row opens /transactions pre-filtered to that category
// and date range, i.e. the actual 明細 behind the number, not just a
// merchant subtotal.
export function CategoryOverviewList({
  rows,
  rangeStart,
  rangeEnd,
  rangeLabel,
}: {
  rows: Row[];
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">這段時間還沒有支出紀錄。</p>;
  }

  function hrefFor(row: Row) {
    const params = new URLSearchParams({
      categoryId: row.categoryId ?? "uncategorized",
      start: rangeStart,
      end: rangeEnd,
      label: rangeLabel,
    });
    return `/transactions?${params.toString()}`;
  }

  const visible = rows.slice(0, VISIBLE_COUNT);
  const rest = rows.slice(VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-1">
      {visible.map((r) => (
        <CategoryOverviewRow key={r.categoryId ?? "uncategorized"} row={r} href={hrefFor(r)} />
      ))}

      {rest.length > 0 && (
        <Collapsible open={showAll} onOpenChange={setShowAll}>
          <CollapsiblePanel>
            <div className="flex flex-col gap-1">
              {rest.map((r) => (
                <CategoryOverviewRow key={r.categoryId ?? "uncategorized"} row={r} href={hrefFor(r)} />
              ))}
            </div>
          </CollapsiblePanel>
          <CollapsibleTrigger>
            {showAll ? "收合" : `顯示更多分類（還有 ${rest.length} 個）`}
            <ChevronDown className={cn("size-4 transition-transform", showAll && "rotate-180")} />
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
}
