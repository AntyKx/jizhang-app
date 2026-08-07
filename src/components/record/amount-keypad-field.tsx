"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "backspace"] as const;

// Thousands-separate the integer part only, so a partial/trailing decimal
// (e.g. "12." while still typing, or "1234.5") is never mangled — plain
// toLocaleString() can't be used here since it doesn't tolerate an in-
// progress value like a trailing "." with no digits after it yet.
function formatAmount(value: string): string {
  if (!value) return "0";
  const [intPart, decPart] = value.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

function bounceDown(e: React.PointerEvent<HTMLElement>) {
  gsap.to(e.currentTarget, { scale: 0.9, duration: 0.1, ease: "power2.out" });
}
function bounceUp(e: React.PointerEvent<HTMLElement>) {
  gsap.to(e.currentTarget, { scale: 1, duration: 0.35, ease: "back.out(2)" });
}

// Drop-in replacement for `<Input type="number">` on amount-style fields —
// value/onChange carry the same raw numeric string, so call sites don't
// need to change their state handling, just swap the element. The display
// is a button (not a focusable input), so tapping it never pops the native
// OS keyboard — instead it slides this component's own keypad panel up
// from the bottom, mirroring how a native keyboard appears, while keeping
// the panel out of the form's normal document flow so it doesn't lengthen
// the page.
export function AmountKeypadField({
  value,
  onChange,
  maxDecimals = 2,
  autoOpen = false,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  maxDecimals?: number;
  // Opens the panel as soon as this component mounts, instead of waiting
  // for a tap — for call sites where the field is the very first thing the
  // user needs to fill in (e.g. picking a category and jumping straight to
  // typing an amount), matching how a native keyboard used to pop up
  // immediately in that spot.
  autoOpen?: boolean;
  // Overrides the display button's size/shape for compact call sites (e.g.
  // sitting inline next to a small button) — merged in last via cn/twMerge
  // so it wins over the default h-16/text-3xl look.
  className?: string;
}) {
  const [open, setOpen] = useState(autoOpen);

  function press(key: (typeof KEYS)[number]) {
    if (key === "backspace") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value === "" ? "0." : value + ".");
      return;
    }
    const decimalIndex = value.indexOf(".");
    if (decimalIndex !== -1 && value.length - decimalIndex - 1 >= maxDecimals) return;
    if (value === "0") {
      onChange(key);
      return;
    }
    onChange(value + key);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-16 items-center justify-center rounded-2xl border bg-card text-3xl font-semibold tabular-nums transition-colors",
          !value && "text-muted-foreground",
          open && "border-primary ring-2 ring-ring",
          className,
        )}
      >
        {formatAmount(value)}
      </button>

      <div
        className={cn(
          "fixed inset-0 z-[60] transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      >
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-md flex-col gap-3 rounded-t-3xl border border-b-0 bg-card p-4 shadow-lg transition-transform duration-300 ease-out",
            "pb-[max(1rem,env(safe-area-inset-bottom))]",
            open ? "translate-y-0" : "translate-y-full",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />

          {/* Repeats the trigger button's value here, inside the sheet
              itself — in a multi-field Dialog (not the full-page /record
              flow this component was originally built for) the trigger
              button can end up positioned wherever the sheet covers, so the
              only way to guarantee the number being typed stays visible is
              to show it inside the sheet, not rely on whatever's still
              exposed underneath. */}
          <div
            className={cn(
              "text-center text-3xl font-semibold tabular-nums",
              !value && "text-muted-foreground",
            )}
          >
            {formatAmount(value)}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                onPointerDown={bounceDown}
                onPointerUp={bounceUp}
                onPointerLeave={bounceUp}
                className={cn(
                  "flex h-14 items-center justify-center rounded-2xl bg-muted text-xl font-semibold shadow-sm transition-colors active:bg-secondary",
                  key === "backspace" && "text-muted-foreground",
                )}
                aria-label={key === "backspace" ? "刪除" : key === "." ? "小數點" : `數字 ${key}`}
              >
                {key === "backspace" ? <Delete className="size-5" /> : key}
              </button>
            ))}
          </div>

          <Button type="button" onClick={() => setOpen(false)}>
            完成
          </Button>
        </div>
      </div>
    </>
  );
}
