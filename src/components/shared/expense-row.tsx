"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSplitExpense, settleParticipant, unsettleParticipant } from "@/app/(app)/shared/actions";
import { isFail } from "@/lib/action-result";
import { EditSplitExpenseDialog } from "@/components/shared/edit-expense-dialog";
import { SettleAccountControl } from "@/components/shared/settle-account-control";
import { SwipeToDelete } from "@/components/transactions/swipe-to-delete";
import type { FlatSplitItem } from "@/lib/shared-expenses";
import type { AccountType } from "@/lib/account-type";

type Category = { id: string; name: string; icon: string | null; color: string | null };
type Account = { id: string; name: string; type: AccountType };

export function SharedExpenseRow({
  item,
  categories,
  accounts,
}: {
  item: FlatSplitItem;
  categories: Category[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function handleSettle(accountId?: string) {
    startTransition(async () => {
      const result = await settleParticipant(item.sharedExpenseId, item.participantIndex, accountId);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已標記結清");
      router.refresh();
    });
  }

  function handleUnsettle(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await unsettleParticipant(item.sharedExpenseId, item.participantIndex);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已復原結清");
      router.refresh();
    });
  }

  async function handleDelete() {
    const result = await deleteSplitExpense(item.sharedExpenseId);
    if (isFail(result)) {
      toast.error(result.error);
      return;
    }
    toast.success("已刪除");
    router.refresh();
  }

  // A linked item (created from a real transaction's 分帳 section) is only
  // editable/deletable from that transaction itself, not here — deleting it
  // here would leave the personal transaction's amount silently
  // unexplained. Standalone (unlinked) items still support both directly.
  const isLinked = item.linkedTransactionId !== null;

  return (
    <>
      <SwipeToDelete
        actions={
          item.isSettled || isLinked
            ? []
            : [{ label: "刪除", icon: <Trash2 className="size-4" />, onClick: handleDelete, className: "bg-destructive text-white" }]
        }
        disabled={item.isSettled || isLinked}
        onTap={item.isSettled || isLinked ? undefined : () => setEditing(true)}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {/* Item name gets its own line — sharing a row with the category
                badge meant a long name (no spaces to break on in Chinese)
                squeezed the badge until it wrapped onto a second line, a
                cramped "text tower next to a floating chip" look. Same fix
                as today-transaction-row.tsx's proven layout: name alone,
                badges + secondary text together below where there's no
                similar long/unbreakable string to fight them for space. */}
            <span className="truncate text-sm font-medium">{item.itemName}</span>
            {/* Category no longer repeated per participant row — it's one
                value per event (sharedExpenses.categoryId), already shown
                once on SplitEventCard's own header via CategoryIconBadge,
                so showing it again on every row here was pure repetition. */}
            {isLinked && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">來自交易</Badge>
              </div>
            )}
            {/* Own line, no badges to compete with for width — putting this
                on the same line as the badges (a prior attempt) meant two
                shrink-0 badges plus a shrink-0 date left nothing for this
                text to shrink into, so it silently rendered at zero width
                and vanished entirely. Who owes whom is folded into this
                string instead of the generic "你欠對方" it used to say — in
                the flat 已結清 list (rendered ungrouped, mixing every
                counterparty together, unlike the per-person unsettled
                cards) this is the only place a settled row's counterparty
                ever shows up. Still two spans so the date keeps a shrink-0
                slot — Tailwind's truncate doesn't set min-width:0 on its
                own, so without shrink-0 the date is what a flex row silently
                drops first (cut off by the app-wide overflow-x:hidden
                instead of getting an ellipsis). */}
            <div className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {item.iOwe ? `你欠 ${item.name}` : `${item.name} 欠你`}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">・{item.occurredAt}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <span className="text-sm font-semibold tabular-nums">
              NT$ {Number(item.amount).toLocaleString("zh-TW")}
            </span>
            {!item.isSettled ? (
              <SettleAccountControl label="結清" accounts={accounts} pending={pending} onSettle={handleSettle} />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={handleUnsettle}
              >
                回復結清
              </Button>
            )}
          </div>
        </div>
      </SwipeToDelete>

      {!isLinked && (
        <EditSplitExpenseDialog
          item={editing ? item : null}
          categories={categories}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
