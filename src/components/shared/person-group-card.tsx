"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { settleAllForName } from "@/app/(app)/shared/actions";
import { isFail } from "@/lib/action-result";
import { computeNetBalance } from "@/lib/shared-balance";
import { SharedExpenseRow } from "@/components/shared/expense-row";
import { SettleAccountControl } from "@/components/shared/settle-account-control";
import type { FlatSplitItem } from "@/lib/shared-expenses";
import type { AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null };
type Account = { id: string; name: string; type: AccountType };

// One counterparty's unsettled items (across however many split events),
// collapsed to a single row — the 依對象 view, for a long-running fixed
// counterparty (couple/roommate AA) where settling is "this person, this
// period, one lump sum" rather than event-by-event. No border/rounded box
// of its own — sits inside the shared divide-y container dashboard.tsx
// wraps around every card in a section, same convention as SplitEventCard.
export function PersonGroupCard({
  name,
  items,
  categories,
  accounts,
  dateFrom,
  dateTo,
}: {
  name: string;
  items: FlatSplitItem[];
  categories: Category[];
  accounts: Account[];
  dateFrom?: string;
  dateTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const net = computeNetBalance(items);
  const rounded = Math.round(Math.abs(net));
  const owedToMe = net >= 0;

  function handleSettleAll(accountId?: string) {
    startTransition(async () => {
      const result = await settleAllForName(name, { from: dateFrom, to: dateTo }, accountId);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已標記結清");
      router.refresh();
    });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-left hover:text-foreground">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
          {name.slice(0, 1)}
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className="text-xs text-muted-foreground">{items.length} 筆未結清</span>
        </span>
        <span className="flex flex-col items-end">
          <span className={cn("text-sm font-bold tabular-nums", owedToMe ? "text-emerald-600" : "text-destructive")}>
            ${rounded.toLocaleString("zh-TW")}
          </span>
          <span className="text-[11px] text-muted-foreground">{owedToMe ? "欠你" : "你欠"}</span>
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
        <div className="flex flex-col items-end gap-2 px-4 py-2.5">
          <SettleAccountControl label="全部結清" accounts={accounts} pending={pending} onSettle={handleSettleAll} />
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
