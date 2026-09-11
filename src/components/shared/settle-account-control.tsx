"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import type { AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

type Account = { id: string; name: string; type: AccountType };

// Shared by all 3 settle entry points (SharedExpenseRow's 結清,
// SplitEventCard's 一次結清全部, PersonGroupCard's 全部結清). Clicking the
// main button keeps working exactly as before — the server falls back to
// its own auto-resolve logic (linked transaction's account, then the
// default account) when no accountId is passed. The chevron is purely an
// opt-in override so the user can represent which account actually
// paid/received the money instead of always landing on the auto-picked one.
export function SettleAccountControl({
  label,
  accounts,
  pending,
  onSettle,
}: {
  label: string;
  accounts: Account[];
  pending: boolean;
  onSettle: (accountId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();

  // Only one account to choose from — no picker needed, identical to the
  // pre-existing behavior.
  if (accounts.length <= 1) {
    return (
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSettle();
        }}
      >
        {pending ? "處理中…" : label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSettle(selected);
          }}
        >
          {pending ? "處理中…" : label}
        </Button>
        <button
          type="button"
          aria-label="選擇入帳帳戶"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted",
            open && "bg-muted",
          )}
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setSelected((cur) => (cur === a.id ? undefined : a.id));
              }}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                selected === a.id
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >
              <AccountTypeIcon type={a.type} className="size-3" />
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
