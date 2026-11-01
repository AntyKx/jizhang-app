"use client";

import { cn } from "@/lib/utils";

// Same switch-row look as the accounts dialogs' 不記入資產 toggle.
export function FixedExpenseSwitch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
        checked ? "border-primary bg-primary/10" : "text-muted-foreground hover:bg-muted",
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span>固定支出</span>
        <span className="truncate text-xs text-muted-foreground">例如房貸、保險、利息</span>
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
