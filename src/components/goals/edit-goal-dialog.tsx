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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteConfirmFooter } from "@/components/ui/delete-confirm-footer";
import { deleteGoal, updateGoal } from "@/app/(app)/goals/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";

type Goal = { id: string; name: string; targetAmount: string; targetDate: string | null };

export function EditGoalDialog({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [prevGoal, setPrevGoal] = useState(goal);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  if (goal !== prevGoal) {
    setPrevGoal(goal);
    setConfirmingDelete(false);
    if (goal) {
      setName(goal.name);
      // Goals are always TWD-denominated, decimals never meaningful — round
      // away any legacy fractional value the allowDecimal={false} keypad
      // below couldn't have typed.
      setTargetAmount(Math.round(Number(goal.targetAmount)).toString());
      setTargetDate(goal.targetDate ?? "");
    }
  }

  function handleSave() {
    if (!goal || !name.trim() || !targetAmount || Number(targetAmount) <= 0) return;
    startTransition(async () => {
      const result = await updateGoal({
        id: goal.id,
        name: name.trim(),
        targetAmount: Number(targetAmount),
        targetDate: targetDate || null,
      });
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已更新目標");
      onClose();
    });
  }

  function handleDelete() {
    if (!goal) return;
    startTransition(async () => {
      await deleteGoal(goal.id);
      toast.success("已刪除目標");
      onClose();
    });
  }

  return (
    <Dialog open={!!goal} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>編輯儲蓄目標</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-goal-name">目標名稱</Label>
            <Input id="edit-goal-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>目標金額</Label>
            <AmountKeypadField value={targetAmount} onChange={setTargetAmount} allowDecimal={false} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-goal-date">目標日期（選填）</Label>
            <Input
              id="edit-goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <DeleteConfirmFooter
            confirming={confirmingDelete}
            onConfirmingChange={setConfirmingDelete}
            confirmMessage="確定要刪除這個儲蓄目標嗎？"
            onDelete={handleDelete}
            pending={pending}
          >
            <Button
              onClick={handleSave}
              disabled={pending || !name.trim() || !targetAmount || Number(targetAmount) <= 0}
            >
              {pending ? "儲存中…" : "儲存"}
            </Button>
          </DeleteConfirmFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
