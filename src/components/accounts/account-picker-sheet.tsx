"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

type PickerAccount = { id: string; name: string; type: AccountType };

// A single trigger button that opens the account list in a bottom sheet —
// for forms where AccountChips' wrap of every account would swallow the
// screen (a user with 13 accounts saw 從 and 到 each take five rows).
export function AccountPickerSheet<A extends PickerAccount>({
  accounts,
  value,
  onChange,
  title,
  placeholder = "選擇帳戶",
  className,
}: {
  accounts: A[];
  value: string;
  onChange: (account: A) => void;
  title: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = accounts.find((a) => a.id === value);

  // Group by type in first-appearance order, so the list keeps the user's
  // own drag-sorted order within each group.
  const groups: { type: AccountType; accounts: A[] }[] = [];
  for (const a of accounts) {
    const group = groups.find((g) => g.type === a.type);
    if (group) group.accounts.push(a);
    else groups.push({ type: a.type, accounts: [a] });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={accounts.length === 0}
        className={cn(
          "flex h-11 w-full min-w-0 items-center gap-1.5 rounded-xl bg-muted/60 px-3 text-sm transition-colors hover:bg-muted disabled:opacity-50",
          className,
        )}
      >
        {selected ? (
          <>
            <AccountTypeIcon type={selected.type} className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-left font-medium">{selected.name}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetTitle>{title}</BottomSheetTitle>
          <div className="flex flex-col">
            {groups.map(({ type, accounts: groupAccounts }) => (
              <div key={type} className="flex flex-col">
                <span className="px-1 pt-3 pb-1.5 text-xs font-semibold text-muted-foreground first:pt-0">
                  {accountTypeLabels[type]}
                </span>
                <div className="flex flex-col divide-y">
                  {groupAccounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        onChange(a);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-1 py-2.5 text-left"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-[30%] bg-primary/12 text-primary">
                        <AccountTypeIcon type={a.type} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
                      {a.id === value && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
