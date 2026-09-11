"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { CategoryIconBadge } from "@/components/category-icon";
import { OTHER_COLOR } from "@/components/stats/chart-colors";
import { cn } from "@/lib/utils";

// Wraps consecutive same-origin settlement transactions from
// groupSettlements() into one collapsed row. Never touches the underlying
// transaction data itself — `children` is whatever row components the
// caller already renders for each item (TodayTransactionRow / RegularRow),
// completely unchanged, just nested one level deeper. Edit/delete/duplicate/
// swipe all keep working exactly as before.
export function SettlementGroupRow({
  label,
  total,
  count,
  categoryIcon,
  categoryColor,
  children,
}: {
  label: string;
  total: number;
  count: number;
  // Every settlement transaction in the group shares the same categoryId —
  // createSettlementTransaction copies it straight from the split event —
  // so any one member's category represents the whole group, same as
  // SplitEventCard's header on the /shared page.
  categoryIcon: string | null;
  categoryColor: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-left hover:text-foreground">
        <CategoryIconBadge
          icon={categoryIcon}
          color={categoryColor ?? OTHER_COLOR}
          className="h-9 w-9"
          iconClassName="h-4 w-4"
        />
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-medium text-foreground">分帳結算：{label}</span>
          <span className="text-xs text-muted-foreground">{count} 筆</span>
        </span>
        <span className="text-sm font-semibold tabular-nums">
          NT$ {Math.round(total).toLocaleString("zh-TW")}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col divide-y">{children}</div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
