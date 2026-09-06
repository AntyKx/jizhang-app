"use client";

import { Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared by all four expense-entry paths (manual amount sheet, edit dialog,
// AI text quick-add, receipt scan) so the "算分帳" affordance looks and
// behaves identically in each. Once checked, also asks who paid — same
// 我付的/{partnerName}付的 choice the standalone /shared page's
// AddSharedExpenseDialog already has, so a shared expense created from a
// personal transaction can record the partner as payer instead of always
// assuming the account owner covered it.
export function SharedExpenseToggle({
  checked,
  onChange,
  paidByMe,
  onPaidByMeChange,
  partnerName,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  paidByMe: boolean;
  onPaidByMeChange: (next: boolean) => void;
  partnerName: string;
}) {
  return (
    <div className="flex flex-col gap-2">
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

      {checked && (
        <div className="flex gap-2 pl-1">
          <button
            type="button"
            onClick={() => onPaidByMeChange(true)}
            className={cn(
              "flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
              paidByMe ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            我付的
          </button>
          <button
            type="button"
            onClick={() => onPaidByMeChange(false)}
            className={cn(
              "flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
              !paidByMe ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {partnerName}付的
          </button>
        </div>
      )}
    </div>
  );
}
