"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { CategoryIconBadge } from "@/components/category-icon";
import { OTHER_COLOR } from "@/components/stats/chart-colors";
import { settleAllParticipantsInEvent } from "@/app/(app)/shared/actions";
import { isFail } from "@/lib/action-result";
import { SharedExpenseRow } from "@/components/shared/expense-row";
import { SettleAccountControl } from "@/components/shared/settle-account-control";
import { computeNetBalance } from "@/lib/shared-balance";
import type { FlatSplitItem } from "@/lib/shared-expenses";
import type { AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null };
type Account = { id: string; name: string; type: AccountType };

// One split-expense event, one card — every participant (settled and
// unsettled mixed) shown together under the bill they belong to, instead of
// the old split between "unsettled grouped by person" and "settled flat
// list". A person's total owed across multiple bills isn't shown anywhere
// anymore (confirmed with the user: not needed — see per-event totals
// instead).
export function SplitEventCard({
  sharedExpenseId,
  eventName,
  items,
  categories,
  accounts,
}: {
  sharedExpenseId: string;
  eventName: string;
  items: FlatSplitItem[];
  categories: Category[];
  accounts: Account[];
}) {
  const router = useRouter();
  const unsettled = items.filter((i) => !i.isSettled);
  const [open, setOpen] = useState(unsettled.length > 0);
  const [pending, startTransition] = useTransition();

  const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
  // Net, not a naive sum — an event's participants can mix directions (some
  // owe me, I owe others), so the outstanding figure and its color both
  // follow the same signed net the rest of the app uses (BalanceCard's
  // headline, the old PersonGroupCard's row coloring), not a hardcoded
  // "always green" that'd be wrong for a mixed or all-I-owe event.
  const net = computeNetBalance(unsettled);
  const owedToMe = net >= 0;

  function handleSettleAll(accountId?: string) {
    startTransition(async () => {
      const result = await settleAllParticipantsInEvent(sharedExpenseId, accountId);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已結清");
      router.refresh();
    });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-left hover:text-foreground">
        <CategoryIconBadge
          icon={items[0].categoryIcon}
          color={items[0].categoryColor ?? OTHER_COLOR}
          className="h-9 w-9"
          iconClassName="h-4 w-4"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">{eventName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {items.length}人
            {unsettled.length > 0 ? (
              <>
                ・{unsettled.length}人未結清・未結清{" "}
                <span className={cn("font-medium tabular-nums", owedToMe ? "text-emerald-600" : "text-destructive")}>
                  NT${Math.round(Math.abs(net)).toLocaleString("zh-TW")}
                </span>
              </>
            ) : (
              `・已結清・NT$${Math.round(total).toLocaleString("zh-TW")}`
            )}
          </span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col divide-y">
          {items.map((item) => (
            <SharedExpenseRow
              key={`${item.sharedExpenseId}-${item.participantIndex}`}
              item={item}
              categories={categories}
              accounts={accounts}
            />
          ))}
        </div>
        {unsettled.length > 0 && (
          <div className="flex flex-col items-end gap-2 px-4 py-2.5">
            <SettleAccountControl
              label={`一次結清全部（${unsettled.length}人）`}
              accounts={accounts}
              pending={pending}
              onSettle={handleSettleAll}
            />
          </div>
        )}
      </CollapsiblePanel>
    </Collapsible>
  );
}
