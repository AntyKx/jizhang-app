"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSharedExpense, settleSharedExpense, unsettleSharedExpense } from "@/app/(app)/shared/actions";
import { isFail } from "@/lib/action-result";
import { EditSharedExpenseDialog } from "@/components/shared/edit-expense-dialog";
import { SwipeToDelete } from "@/components/transactions/swipe-to-delete";

type Category = { id: string; name: string; icon: string | null };

export type SharedExpense = {
  id: string;
  name: string;
  amount: string;
  paidByMe: boolean;
  occurredAt: string;
  isSettled: boolean;
  categoryId: string | null;
  categoryName: string | null;
};

export function SharedExpenseRow({
  expense,
  partnerName,
  categories,
}: {
  expense: SharedExpense;
  partnerName: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const payerName = expense.paidByMe ? "你" : partnerName;

  function handleSettle(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await settleSharedExpense(expense.id);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已標記結清");
      router.refresh();
    });
  }

  // Reverts a mistaken 結清 — if this item was part of a "一鍵結清" batch,
  // the whole batch reverts together (see unsettleSharedExpense), which
  // shows up here simply as more than one row moving back to 未結清.
  function handleUnsettle(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await unsettleSharedExpense(expense.id);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已復原結清");
      router.refresh();
    });
  }

  async function handleDelete() {
    const result = await deleteSharedExpense(expense.id);
    if (isFail(result)) {
      toast.error(result.error);
      return;
    }
    toast.success("已刪除");
    router.refresh();
  }

  return (
    <>
      <SwipeToDelete
        actions={
          expense.isSettled
            ? []
            : [
                {
                  label: "刪除",
                  icon: <Trash2 className="size-4" />,
                  onClick: handleDelete,
                  className: "bg-destructive text-white",
                },
              ]
        }
        disabled={expense.isSettled}
        onTap={expense.isSettled ? undefined : () => setEditing(true)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{expense.name}</span>
              {expense.categoryName && <Badge variant="outline">{expense.categoryName}</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">
              {payerName}付款・{expense.occurredAt}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              NT$ {Number(expense.amount).toLocaleString("zh-TW")}
            </span>
            {!expense.isSettled ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleSettle}
              >
                結清
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleUnsettle}
              >
                回復結清
              </Button>
            )}
          </div>
        </div>
      </SwipeToDelete>

      <EditSharedExpenseDialog
        expense={editing ? expense : null}
        categories={categories}
        partnerName={partnerName}
        onClose={() => setEditing(false)}
      />
    </>
  );
}
