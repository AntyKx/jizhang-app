"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Row = { name: string; icon: string | null; amount: number; color: string };

const VISIBLE_COUNT = 6;

function CategoryRow({ row: r, max }: { row: Row; max: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5">
          <CategoryIcon icon={r.icon} className="h-4 w-4" />
          <span>{r.name}</span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          {Math.round(r.amount).toLocaleString("zh-TW")}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(4, (r.amount / max) * 100)}%`,
            backgroundColor: r.color,
          }}
        />
      </div>
    </div>
  );
}

export function CategoryBreakdown({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">這個月還沒有支出紀錄。</p>;
  }

  const max = Math.max(...rows.map((r) => r.amount));
  const visible = rows.slice(0, VISIBLE_COUNT);
  const rest = rows.slice(VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-3">
      {visible.map((r) => (
        <CategoryRow key={r.name} row={r} max={max} />
      ))}

      {rest.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsiblePanel>
            <div className="flex flex-col gap-3 pt-3">
              {rest.map((r) => (
                <CategoryRow key={r.name} row={r} max={max} />
              ))}
            </div>
          </CollapsiblePanel>
          <CollapsibleTrigger>
            {open ? "收合" : `顯示更多分類（還有 ${rest.length} 個）`}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
}
