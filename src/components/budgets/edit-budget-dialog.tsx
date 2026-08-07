"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { deleteBudget, updateBudget } from "@/app/(app)/budgets/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";

type Budget = { id: string; categoryName: string | null; limitAmount: string };

export function EditBudgetDialog({ budget, onClose }: { budget: Budget | null; onClose: () => void }) {
  const [limitAmount, setLimitAmount] = useState("");
  const [prevBudget, setPrevBudget] = useState(budget);
  const [pending, startTransition] = useTransition();

  if (budget !== prevBudget) {
    setPrevBudget(budget);
    if (budget) setLimitAmount(budget.limitAmount);
  }

  function handleSave() {
    if (!budget || !limitAmount || Number(limitAmount) <= 0) return;
    startTransition(async () => {
      await updateBudget(budget.id, Number(limitAmount));
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
          <AmountKeypadField value={limitAmount} onChange={setLimitAmount} />
        </div>

        <DialogFooter>
          <Button variant="destructive" disabled={pending} onClick={handleDelete}>
            刪除
          </Button>
          <Button onClick={handleSave} disabled={pending || !limitAmount || Number(limitAmount) <= 0}>
            {pending ? "儲存中…" : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
