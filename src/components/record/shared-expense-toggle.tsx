"use client";

import { Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared by all three expense-entry paths (manual amount sheet, AI text
// quick-add, receipt scan) so the "算分帳" affordance looks and behaves
// identically in each.
export function SharedExpenseToggle({
  checked,
  onChange,
  partnerName,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  partnerName: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
        checked ? "border-primary bg-primary/10" : "text-muted-foreground hover:bg-muted",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Handshake className="size-4 shrink-0" strokeWidth={1.75} />
        這筆算分帳（跟{partnerName}平分）
      </span>
      <span
        className={cn(
          "flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "justify-end bg-primary" : "justify-start bg-muted-foreground/30",
        )}
      >
        <span className="m-0.5 h-4 w-4 rounded-full bg-white shadow" />
      </span>
    </button>
  );
}
