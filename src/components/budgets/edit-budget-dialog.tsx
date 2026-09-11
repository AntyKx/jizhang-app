"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DeleteConfirmFooter } from "@/components/ui/delete-confirm-footer";
import { deleteBudget, updateBudget } from "@/app/(app)/budgets/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";

type Budget = { id: string; categoryName: string | null; limitAmount: string };

export function EditBudgetDialog({ budget, onClose }: { budget: Budget | null; onClose: () => void }) {
  const [limitAmount, setLimitAmount] = useState("");
  const [prevBudget, setPrevBudget] = useState(budget);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  if (budget !== prevBudget) {
    setPrevBudget(budget);
    setConfirmingDelete(false);
    // Budgets are always TWD-denominated (no per-budget currency), so
    // decimals are never meaningful — round away any legacy fractional
    // value the allowDecimal={false} keypad below couldn't have typed.
    if (budget) setLimitAmount(Math.round(Number(budget.limitAmount)).toString());
  }

  function handleSave() {
    if (!budget || !limitAmount || Number(limitAmount) <= 0) return;
    startTransition(async () => {
      const result = await updateBudget(budget.id, Number(limitAmount));
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已更新預算");
      onClose();
    });
  }

  function handleDelete() {
    if (!budget) return;
    startTransition(async () => {
      await deleteBudget(budget.id);
      toast.success("已刪除預算");
      onClose();
    });
  }

  return (
    <Dialog open={!!budget} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>編輯{budget?.categoryName ?? "整體"}預算</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label>預算上限</Label>
          <AmountKeypadField value={limitAmount} onChange={setLimitAmount} allowDecimal={false} />
        </div>

        <DeleteConfirmFooter
          confirming={confirmingDelete}
          onConfirmingChange={setConfirmingDelete}
          confirmMessage="確定要刪除這個預算嗎？"
          onDelete={handleDelete}
          pending={pending}
        >
          <Button onClick={handleSave} disabled={pending || !limitAmount || Number(limitAmount) <= 0}>
            {pending ? "儲存中…" : "儲存"}
          </Button>
        </DeleteConfirmFooter>
      </DialogContent>
    </Dialog>
  );
}
