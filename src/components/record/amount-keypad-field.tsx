"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Delete } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | "." | "backspace" | "+" | "-" | "=";

const KEYS_WITH_DECIMAL: Key[] = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "backspace"];
// No "." key — 0 takes its place and spans both columns, backspace stays
// last. Used for currencies where a fractional amount is never meaningful
// (see lib/currency.ts's currencyAllowsDecimal).
const KEYS_NO_DECIMAL: Key[] = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "backspace"];
// Calculator layout: a fourth column of ⌫ + − =, and a "00" key. Lets
// "120 + 85" or a bill minus someone's share be typed straight in instead
// of worked out in your head first.
const CALC_KEYS_WITH_DECIMAL: Key[] = ["7", "8", "9", "backspace", "4", "5", "6", "+", "1", "2", "3", "-", "00", "0", ".", "="];
const CALC_KEYS_NO_DECIMAL: Key[] = ["7", "8", "9", "backspace", "4", "5", "6", "+", "1", "2", "3", "-", "00", "0", "="];

const KEY_LABELS: Partial<Record<Key, string>> = {
  backspace: "刪除",
  ".": "小數點",
  "+": "加",
  "-": "減",
  "=": "等於",
};

// Thousands-separate the integer part only, so a partial/trailing decimal
// (e.g. "12." while still typing, or "1234.5") is never mangled — plain
// toLocaleString() can't be used here since it doesn't tolerate an in-
// progress value like a trailing "." with no digits after it yet.
function formatAmount(value: string): string {
  if (!value) return "0";
  if (value.startsWith("-")) return `-${formatAmount(value.slice(1))}`;
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
  allowNegative = false,
  calculator = !allowNegative,
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
  // Adds a +/− toggle next to the display, for values that can legitimately
  // go below zero (an account's opening balance — credit card debt, a loan).
  // The sign lives as a leading "-" in the value string; a lone "-" means
  // "negative, no digits yet".
  allowNegative?: boolean;
  // The + − = column. Off by default only where the sign toggle is on (the
  // two would fight over what a minus means).
  calculator?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  // A pending "left operand + operator" while the right operand is being
  // typed. `value` (the caller's string) is always just the operand on
  // screen; the sum is only written back through onChange once it's
  // resolved — by "=", by the bottom button, or by the keypad closing.
  const [pendingOp, setPendingOp] = useState<{ left: number; op: "+" | "-" } | null>(null);
  const displayRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Height of the overlay panel, measured so room can be made for it.
  // Without that the panel (~420px) covered the display itself whenever the
  // form was short — the record sheet sizes to its content, so with few
  // fields the amount sat right where the panel slides up. Stays 0 inside a
  // Dialog: there the overlay is laid out relative to the Dialog (see
  // `inline`), not the screen.
  const [panelHeight, setPanelHeight] = useState(0);
  useEffect(() => {
    const display = displayRef.current;
    const panel = panelRef.current;
    if (inline || !display || !panel || display.closest('[data-slot="dialog-content"]')) return;
    const observer = new ResizeObserver(() => setPanelHeight(panel.offsetHeight));
    observer.observe(panel);
    return () => observer.disconnect();
  }, [inline]);

  // While open, pad the bottom of the enclosing sheet by the panel's
  // height: the sheet grows upward, pushing the display above the panel,
  // while the fields under the display stay visible and the added room sits
  // exactly behind the panel. (A spacer right under the display was tried
  // first; it left a visible blank gap between the display and the panel.)
  useEffect(() => {
    if (!open || panelHeight === 0) return;
    const body = displayRef.current?.closest<HTMLElement>('[data-slot="bottom-sheet-body"]');
    if (!body) return;
    const previous = body.style.paddingBottom;
    body.style.paddingBottom = `${panelHeight}px`;
    return () => {
      body.style.paddingBottom = previous;
    };
  }, [open, panelHeight]);

  // The padding makes room; this scrolls into it when the display is still
  // behind the panel — a field lower on a scrolling page, or a sheet
  // already at its max height. Measured after the panel's 300ms slide.
  useEffect(() => {
    if (!open || panelHeight === 0) return;
    const timer = setTimeout(() => {
      const display = displayRef.current;
      if (!display) return;
      const overlap = display.getBoundingClientRect().bottom + 12 - (window.innerHeight - panelHeight);
      if (overlap <= 0) return;
      let scroller = display.parentElement;
      while (scroller) {
        const { overflowY } = getComputedStyle(scroller);
        if ((overflowY === "auto" || overflowY === "scroll") && scroller.scrollHeight > scroller.clientHeight) break;
        scroller = scroller.parentElement;
      }
      if (scroller) scroller.scrollBy({ top: overlap, behavior: "smooth" });
      else if (!display.closest('[data-slot="bottom-sheet-content"]')) window.scrollBy({ top: overlap, behavior: "smooth" });
    }, 320);
    return () => clearTimeout(timer);
  }, [open, panelHeight]);

  const KEYS = calculator
    ? allowDecimal
      ? CALC_KEYS_WITH_DECIMAL
      : CALC_KEYS_NO_DECIMAL
    : allowDecimal
      ? KEYS_WITH_DECIMAL
      : KEYS_NO_DECIMAL;

  const negative = value.startsWith("-");

  // The pending sum as a value string. Rounded to what this field can hold;
  // a result at or below zero clears the field rather than writing a
  // negative amount no caller expects.
  function resolvePending(): string {
    if (!pendingOp) return value;
    const right = Number(value) || 0;
    const raw = pendingOp.op === "+" ? pendingOp.left + right : pendingOp.left - right;
    const factor = 10 ** (allowDecimal ? maxDecimals : 0);
    const rounded = Math.round(raw * factor) / factor;
    return rounded > 0 ? String(rounded) : "";
  }

  // Writes any pending sum back before the keypad goes away, so a half
  // typed "120 +" never leaves the caller holding only one operand.
  function settle(): string {
    if (!pendingOp) return value;
    const result = resolvePending();
    setPendingOp(null);
    onChange(result);
    return result;
  }

  function close() {
    settle();
    setOpen(false);
  }

  function press(key: Key) {
    const sign = negative ? "-" : "";
    const digits = negative ? value.slice(1) : value;
    if (key === "+" || key === "-") {
      if (pendingOp && digits === "") {
        // Operator tapped twice in a row: just switch it.
        setPendingOp({ left: pendingOp.left, op: key });
        return;
      }
      if (!pendingOp && (digits === "" || Number(digits) === 0)) return;
      setPendingOp({ left: Number(resolvePending()) || 0, op: key });
      onChange("");
      return;
    }
    if (key === "=") {
      settle();
      return;
    }
    if (key === "backspace") {
      if (pendingOp && digits === "") {
        // Nothing typed after the operator yet: take the operator back.
        setPendingOp(null);
        onChange(String(pendingOp.left));
        return;
      }
      // Keep the sign once digits run out, so clearing a negative amount
      // doesn't silently flip it positive; the toggle removes it.
      onChange(sign + digits.slice(0, -1));
      return;
    }
    if (key === "00") {
      // Only ever extends a whole number already started: "00" on an empty
      // field or after a decimal point would just be noise.
      if (digits === "" || digits === "0" || digits.includes(".") || digits.length > 10) return;
      onChange(sign + digits + "00");
      return;
    }
    if (key === ".") {
      if (digits.includes(".")) return;
      onChange(sign + (digits === "" ? "0." : digits + "."));
      return;
    }
    const decimalIndex = digits.indexOf(".");
    if (decimalIndex !== -1 && digits.length - decimalIndex - 1 >= maxDecimals) return;
    // numeric(14,2) tops out at 12 integer digits.
    if (decimalIndex === -1 && digits.length >= 12) return;
    if (digits === "0") {
      onChange(sign + key);
      return;
    }
    onChange(sign + digits + key);
  }

  function toggleSign() {
    onChange(negative ? value.slice(1) : "-" + value);
  }

  const keys = (
    <div className={cn("grid gap-2", calculator ? "grid-cols-4" : "grid-cols-3")}>
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
            (key === "+" || key === "-" || key === "=") && "bg-primary/10 text-primary active:bg-primary/20",
            pendingOp?.op === key && "bg-primary text-primary-foreground active:bg-primary",
            // 0 takes the "." key's old grid spot in no-decimal mode —
            // span it across both so it doesn't leave a lone empty
            // cell at the end of the grid.
            !allowDecimal && key === "0" && "col-span-2",
          )}
          aria-label={KEY_LABELS[key] ?? `數字 ${key}`}
        >
          {key === "backspace" ? <Delete className="size-5" /> : key === "-" ? "−" : key}
        </button>
      ))}
    </div>
  );
  // With a sum still pending, the bottom button resolves it first (and
  // says so) instead of confirming: onConfirm callers read their own state,
  // which only has the final number after that onChange has been rendered.
  const confirmButton = (
    <Button
      type="button"
      disabled={pendingOp ? false : onConfirm ? !value || Number(value) <= 0 : false}
      onClick={() => {
        if (pendingOp) {
          settle();
          return;
        }
        onConfirm?.();
        setOpen(false);
      }}
    >
      {pendingOp ? "計算" : confirmLabel}
    </Button>
  );

  // "120 + 85" while a sum is pending, otherwise just the value.
  const expression = pendingOp
    ? `${formatAmount(String(pendingOp.left))} ${pendingOp.op === "+" ? "+" : "−"}${value ? ` ${formatAmount(value)}` : ""}`
    : formatAmount(value);

  // A tap outside the keypad closes it. When that tap landed on another
  // control of the same form (an account chip, 備註, the save button) it's
  // passed on as well, so reaching for the next field is one tap instead of
  // "tap to dismiss, tap again". Anything else (the dimmed backdrop, empty
  // space) only closes the keypad, as before, so a stray tap can't dismiss
  // the whole sheet with a half-entered record in it.
  function handleOutsideTap(e: React.MouseEvent<HTMLDivElement>) {
    // flushSync: the control being passed the tap (say, the save button)
    // must already see a just-resolved sum, not the render from before it.
    flushSync(close);
    const overlay = e.currentTarget;
    overlay.style.pointerEvents = "none";
    const under = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = "";
    const scope = displayRef.current?.closest('[data-slot="bottom-sheet-body"], [data-slot="dialog-content"]');
    if (!(under instanceof HTMLElement) || !scope?.contains(under)) return;
    const target = under.closest<HTMLElement>("button, a, input, textarea, select, [role='button']");
    if (!target || !scope.contains(target) || displayRef.current?.contains(target)) return;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      target.focus();
      if (target instanceof HTMLInputElement && target.type === "date") {
        try {
          target.showPicker();
        } catch {
          // Not supported here; the focus above is enough to tap it open.
        }
      }
      return;
    }
    target.click();
  }

  const displayButton = (
    <button
      ref={displayRef}
      type="button"
      onClick={() => {
        if (inline && open) close();
        else setOpen(true);
      }}
      className={cn(
        "flex h-16 items-center justify-center rounded-2xl border bg-card text-3xl font-semibold tabular-nums transition-colors",
        allowNegative && "min-w-0 flex-1",
        (!value || value === "-") && !pendingOp && "text-muted-foreground",
        negative && value !== "-" && "text-destructive",
        open && "border-primary ring-2 ring-ring",
        className,
      )}
    >
      <span className="truncate px-2">{expression}</span>
    </button>
  );
  const display = allowNegative ? (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={toggleSign}
        aria-label={negative ? "改為正數" : "改為負數"}
        aria-pressed={negative}
        className={cn(
          "flex h-16 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl font-semibold transition-colors",
          negative ? "border-destructive/40 bg-destructive/10 text-destructive" : "bg-card text-muted-foreground",
        )}
      >
        {negative ? "−" : "+"}
      </button>
      {displayButton}
    </div>
  ) : (
    displayButton
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
        onClick={handleOutsideTap}
      >
        <div
          ref={panelRef}
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
              "truncate text-center text-3xl font-semibold tabular-nums",
              !value && !pendingOp && "text-muted-foreground",
            )}
          >
            {expression}
          </div>

          {keys}
          {confirmButton}
        </div>
      </div>
    </>
  );
}
