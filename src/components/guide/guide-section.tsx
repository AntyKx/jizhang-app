"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// One collapsible block per feature area on the /guide page — each manages
// its own open state (rather than an uncontrolled Collapsible) so the
// chevron can rotate the same way SplitEventCard/SettlementGroupRow already
// do elsewhere, instead of guessing at base-ui's open-state data attribute.
//
// `icon` takes an already-rendered element (<BookOpen .../>), not the icon
// component itself — the page that renders this stays a server component,
// and a bare component reference (a function) can't cross the server/client
// boundary as a prop, only an already-instantiated element can.
export function GuideSection({
  icon,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col rounded-2xl border bg-card">
      <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-left hover:text-foreground">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col gap-2 px-4 pb-4 text-sm leading-relaxed text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5 [&_strong]:font-medium [&_strong]:text-foreground">
          {children}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
