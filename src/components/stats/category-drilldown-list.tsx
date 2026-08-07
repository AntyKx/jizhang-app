"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Row = { key: string; name: string; icon: string | null; amount: number; color: string };
type Drilldown = { merchant: string; amount: number };

const VISIBLE_COUNT = 6;

function CategoryDetailRow({
  row,
  max,
  drilldown,
  expanded,
  onToggle,
}: {
  row: Row;
  max: number;
  drilldown: Drilldown[] | undefined;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        disabled={!drilldown || drilldown.length === 0}
        className="flex flex-col gap-1 text-left disabled:cursor-default"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <CategoryIcon icon={row.icon} className="h-4 w-4" />
            <span>{row.name}</span>
            {drilldown && drilldown.length > 0 && (
              <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            )}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {Math.round(row.amount).toLocaleString("zh-TW")}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(4, (row.amount / max) * 100)}%`, backgroundColor: row.color }}
          />
        </div>
      </button>

      {expanded && drilldown && drilldown.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-muted/60 px-3 py-2 text-xs">
          {drilldown.map((d) => (
            <div key={d.merchant} className="flex items-center justify-between text-muted-foreground">
              <span className="truncate">{d.merchant}</span>
              <span className="tabular-nums">{Math.round(d.amount).toLocaleString("zh-TW")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Same list+collapse shape as the old flat CategoryBreakdown, but each row
// expands inline to show its top merchants (from getCategoryDrilldowns) —
// lets a long category list stay compact while still surfacing "where did
// this money actually go" a tap away, instead of always showing everything.
export function CategoryDrilldownList({
  rows,
  drilldowns,
}: {
  rows: Row[];
  drilldowns: Record<string, Drilldown[]>;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">這個範圍還沒有支出紀錄。</p>;
  }

  const max = Math.max(...rows.map((r) => r.amount));
  const visible = rows.slice(0, VISIBLE_COUNT);
  const rest = rows.slice(VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-3">
      {visible.map((r) => (
        <CategoryDetailRow
          key={r.key}
          row={r}
          max={max}
          drilldown={drilldowns[r.key]}
          expanded={expandedKey === r.key}
          onToggle={() => setExpandedKey((k) => (k === r.key ? null : r.key))}
        />
      ))}

      {rest.length > 0 && (
        <Collapsible open={showAll} onOpenChange={setShowAll}>
          <CollapsiblePanel>
            <div className="flex flex-col gap-3 pt-3">
              {rest.map((r) => (
                <CategoryDetailRow
                  key={r.key}
                  row={r}
                  max={max}
                  drilldown={drilldowns[r.key]}
                  expanded={expandedKey === r.key}
                  onToggle={() => setExpandedKey((k) => (k === r.key ? null : r.key))}
                />
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
