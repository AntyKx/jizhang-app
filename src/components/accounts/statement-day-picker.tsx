"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// Credit-card statement day as a month-calendar grid (same cell look as the
// split page's date-range sheet) instead of a 31-item dropdown. It's a day
// of the month, not a date, so there's no month header or weekday row.
// Expands inline rather than in a sheet: it lives inside the account
// Dialogs, where a fixed overlay would get trapped by the Dialog's
// transform (see AmountKeypadField's `inline`).
export function StatementDayPicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? Number(value) : null;

  return (
    <div className="flex flex-col gap-2">
      <button
        id={id}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CalendarDays className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <span className={cn("flex-1 text-left", !selected && "text-muted-foreground")}>
          {selected ? `每月 ${selected} 日` : "選擇結帳日"}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="rounded-xl border p-2">
          <div className="grid grid-cols-7">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onChange(String(d));
                  setOpen(false);
                }}
                className={cn(
                  "flex h-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                  selected === d ? "bg-primary font-medium text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {d}
              </button>
            ))}
          </div>
          {selected && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="mt-1 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              不設定結帳日
            </button>
          )}
        </div>
      )}
    </div>
  );
}
