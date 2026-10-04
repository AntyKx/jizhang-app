"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEYS_WITH_DECIMAL = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "backspace"] as const;
// No "." key — 0 takes its place and spans both columns, backspace stays
// last. Used for currencies where a fractional amount is never meaningful
// (see lib/currency.ts's currencyAllowsDecimal).
const KEYS_NO_DECIMAL = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "backspace"] as const;

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
  allowDecimal = true,
  autoOpen = false,
  label,
  confirmLabel = "完成",
  onConfirm,
  inline = false,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  maxDecimals?: number;
  // Drops the "." key entirely for currencies where a fractional amount is
  // never meaningful (see lib/currency.ts's currencyAllowsDecimal) — 0 takes
  // its grid spot instead. Defaults to true (unchanged keypad) for call
  // sites with no currency context of their own.
  allowDecimal?: boolean;
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
  // Context shown above the value inside the panel — the panel covers the
  // bottom of the screen, so whatever the user was looking at (which goal,
  // which field) is often hidden behind it.
  label?: React.ReactNode;
  // Turns the panel's bottom button into the call site's own submit (e.g.
  // 存入) instead of a plain close, so there's no 完成-then-tap-again step.
  // Disabled while the value is empty.
  confirmLabel?: string;
  onConfirm?: () => void;
  // Expands the keypad in the normal flow right under the display instead
  // of the bottom overlay panel. For call sites inside a centered Dialog:
  // the Dialog's translate makes it the overlay's containing block, so the
  // "fixed" panel ended up filling the Dialog itself and hid every other
  // field (name, date, category) while typing.
  inline?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const KEYS = allowDecimal ? KEYS_WITH_DECIMAL : KEYS_NO_DECIMAL;

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

  const keys = (
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
            "flex items-center justify-center rounded-2xl bg-muted font-semibold shadow-sm transition-colors active:bg-secondary",
            // Shorter keys inline, so the Dialog grows as little as possible.
            inline ? "h-11 text-lg" : "h-14 text-xl",
            key === "backspace" && "text-muted-foreground",
            // 0 takes the "." key's old grid spot in no-decimal mode —
            // span it across both so it doesn't leave a lone empty
            // cell at the end of the grid.
            !allowDecimal && key === "0" && "col-span-2",
          )}
          aria-label={key === "backspace" ? "刪除" : key === "." ? "小數點" : `數字 ${key}`}
        >
          {key === "backspace" ? <Delete className="size-5" /> : key}
        </button>
      ))}
    </div>
  );
  const confirmButton = (
    <Button
      type="button"
      disabled={onConfirm ? !value || Number(value) <= 0 : false}
      onClick={() => {
        onConfirm?.();
        setOpen(false);
      }}
    >
      {confirmLabel}
    </Button>
  );

  const display = (
    <button
      type="button"
      onClick={() => setOpen(inline ? !open : true)}
      className={cn(
        "flex h-16 items-center justify-center rounded-2xl border bg-card text-3xl font-semibold tabular-nums transition-colors",
        !value && "text-muted-foreground",
        open && "border-primary ring-2 ring-ring",
        className,
      )}
    >
      {formatAmount(value)}
    </button>
  );

  if (inline) {
    return (
      <div className="flex flex-col">
        {display}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden" inert={!open}>
            <div className="h-1 shrink-0" />
            {keys}
            {confirmButton}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {display}

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
          {label && <div className="text-center text-sm text-muted-foreground">{label}</div>}
          <div
            className={cn(
              "text-center text-3xl font-semibold tabular-nums",
              !value && "text-muted-foreground",
            )}
          >
            {formatAmount(value)}
          </div>

          {keys}
          {confirmButton}
        </div>
      </div>
    </>
  );
}
