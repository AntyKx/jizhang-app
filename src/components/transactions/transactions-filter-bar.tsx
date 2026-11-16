"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AccountPickerSheet } from "@/components/accounts/account-picker-sheet";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import type { AccountType } from "@/lib/account-type";
import type { TransactionsTypeFilter } from "@/lib/transactions/list-types";
import { cn } from "@/lib/utils";

const typeChips: { value: TransactionsTypeFilter | undefined; label: string }[] = [
  { value: undefined, label: "全部" },
  { value: "expense", label: "支出" },
  { value: "income", label: "收入" },
  { value: "transfer", label: "轉帳" },
];

// 類型 / 帳戶 / 日期區間 for /transactions. Everything lives in the URL (the
// page re-queries on the server), so a filtered list survives a refresh and
// "load more" pages through the same narrowed set.
export function TransactionsFilterBar({
  accounts,
  type,
  accountId,
  start,
  end,
}: {
  accounts: { id: string; name: string; type: AccountType }[];
  type?: TransactionsTypeFilter;
  accountId?: string;
  start?: string;
  end?: string;
}) {
  const router = useRouter();

  function href(next: { type?: string; account?: string; start?: string; end?: string }) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const query = params.toString();
    return query ? `/transactions?${query}` : "/transactions";
  }
  const current = { type, account: accountId, start, end };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {typeChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => router.replace(href({ ...current, type: chip.value }), { scroll: false })}
            className={cn(
              "h-9 flex-1 rounded-full text-sm font-medium transition-colors",
              type === chip.value ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <AccountPickerSheet
            title="只看哪個帳戶"
            placeholder="全部帳戶"
            accounts={accounts}
            value={accountId ?? ""}
            onChange={(a) => router.replace(href({ ...current, account: a.id }), { scroll: false })}
            className="h-9 rounded-lg"
          />
          {accountId && (
            <button
              type="button"
              onClick={() => router.replace(href({ ...current, account: undefined }), { scroll: false })}
              aria-label="清除帳戶篩選"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <DateRangeFilter
          // Remounted when the range changes from outside (e.g. cleared), so
          // its own picked-range state never shows a stale selection.
          key={`${start ?? ""}~${end ?? ""}`}
          from={start}
          to={end}
          buildHref={(range) => href({ ...current, start: range?.from, end: range?.to })}
          className="min-w-0 gap-1 rounded-none border-0 bg-transparent p-0"
        />
      </div>
    </div>
  );
}
