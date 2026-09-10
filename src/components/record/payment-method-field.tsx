"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { PaymentMethodIcon } from "@/components/transactions/payment-method-icon";
import {
  paymentMethodLabel,
  paymentMethods,
  paymentMethodsForAccountType,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

// The account already says how you paid — a credit-card account means you
// paid by credit card — so asking again as a second equal-weight row of
// buttons was both a redundant decision on every entry and a way to record
// impossible combinations (八成重複、兩成互相矛盾, measured 2026-09-09).
//
// Collapsed to a single quiet line showing what the account implies, and
// only expands when the payment rail genuinely differs from the funding
// source (LINE Pay off a credit card, say). Callers keep owning the value;
// this component only decides how it's presented and which alternatives are
// offered.
export function PaymentMethodField({
  accountType,
  value,
  onChange,
}: {
  // undefined when the caller has no account context at all (e.g. before
  // any account exists) — every method stays offerable in that case.
  accountType: AccountType | undefined;
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}) {
  const derived = accountType ? accountTypeToPaymentMethod[accountType] : undefined;
  const isManual = derived !== undefined && value !== derived;
  // An already-overridden value (including a contradictory one saved before
  // this component existed) opens expanded, so editing an old entry never
  // hides what it's actually set to.
  const [expanded, setExpanded] = useState(isManual);

  if (!expanded) {
    return (
      // flex-wrap (not just min-w-0 on the left group) is what actually
      // guarantees 變更 can never end up pushed past the visible edge —
      // min-w-0 only lets a flex item's box shrink below its content's
      // natural width, it doesn't stop that content from visually
      // overflowing the shrunk box, which on some text-metric edge cases
      // (a font-fallback difference measuring 跟著帳戶/金融卡 wider than
      // expected) could still leave 變更 sitting to the right of where the
      // row visually ends. flex-wrap instead drops 變更 to its own line
      // whenever the row genuinely doesn't have room, which never overflows
      // sideways by construction.
      <div className="flex flex-wrap items-center justify-between gap-2 py-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">付款方式</span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <PaymentMethodIcon method={value} />
            {paymentMethodLabel(value)}
          </span>
          {derived !== undefined && <span className="text-[10.5px] text-muted-foreground">跟著帳戶</span>}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary"
        >
          變更
        </button>
      </div>
    );
  }

  // Whatever is currently selected always stays in the list even when it
  // isn't one this account type would offer — otherwise opening an older
  // entry would silently drop its saved value on the next save.
  const offered = accountType ? paymentMethodsForAccountType[accountType] : paymentMethods.map((p) => p.value);
  const options = offered.includes(value) ? offered : [value, ...offered];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label>付款方式</Label>
        {isManual && (
          <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary">
            已手動指定
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors",
              value === method
                ? "bg-primary/10 text-primary"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            <PaymentMethodIcon method={method} />
            {paymentMethodLabel(method)}
          </button>
        ))}
      </div>
      {derived !== undefined && (
        <button
          type="button"
          onClick={() => {
            onChange(derived);
            setExpanded(false);
          }}
          className="self-start text-xs text-muted-foreground underline underline-offset-4"
        >
          恢復成跟著帳戶（{paymentMethodLabel(derived)}）
        </button>
      )}
    </div>
  );
}
