"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSharedExpense, settleSharedExpense } from "@/app/(app)/shared/actions";
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
      try {
        await settleSharedExpense(expense.id);
        toast.success("已標記結清");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "結清失敗");
      }
    });
  }

  async function handleDelete() {
    try {
      await deleteSharedExpense(expense.id);
      toast.success("已刪除");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
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
            {!expense.isSettled && (
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleSettle}
              >
                結清
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
