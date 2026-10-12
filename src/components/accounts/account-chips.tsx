"use client";

import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import type { AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

type ChipAccount = { id: string; name: string; type: AccountType };

// The one way to pick an account in a form: a wrap of rounded chips with
// the account-type icon. Every form used to carry its own copy, and they had
// drifted apart (bordered in subscriptions, a dropdown in transfers).
export function AccountChips<A extends ChipAccount>({
  accounts,
  value,
  onChange,
  className,
}: {
  accounts: A[];
  value: string;
  onChange: (account: A) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("flex flex-wrap gap-2", className)}>
      {accounts.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={value === a.id}
          onClick={() => onChange(a)}
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors",
            value === a.id ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground hover:bg-muted",
          )}
        >
          <AccountTypeIcon type={a.type} className="size-3.5" />
          {a.name}
        </button>
      ))}
    </div>
  );
}
