"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Takes already-rendered rows (built server-side, e.g. with CountUpNumber)
// and shows only the first `visibleCount`, collapsing the rest behind a
// toggle — used wherever a list (budgets, goals, anomalies) has no natural
// cap and can otherwise run on indefinitely.
export function CollapsibleProgressList({
  items,
  visibleCount = 5,
  gapClassName = "gap-4",
}: {
  items: { key: string; node: ReactNode }[];
  visibleCount?: number;
  gapClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const visible = items.slice(0, visibleCount);
  const rest = items.slice(visibleCount);

  return (
    <div className={cn("flex flex-col", gapClassName)}>
      {visible.map((i) => (
        <div key={i.key}>{i.node}</div>
      ))}

      {rest.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsiblePanel>
            <div className={cn("flex flex-col pt-4", gapClassName)}>
              {rest.map((i) => (
                <div key={i.key}>{i.node}</div>
              ))}
            </div>
          </CollapsiblePanel>
          <CollapsibleTrigger>
            {open ? "收合" : `顯示更多（還有 ${rest.length} 項）`}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
}
