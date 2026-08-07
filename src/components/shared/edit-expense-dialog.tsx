"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteSharedExpense, updateSharedExpense } from "@/app/(app)/shared/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null };

export type EditableSharedExpense = {
  id: string;
  name: string;
  amount: string;
  paidByMe: boolean;
  categoryId: string | null;
  occurredAt: string;
};

export function EditSharedExpenseDialog({
  expense,
  categories,
  partnerName,
  onClose,
}: {
  expense: EditableSharedExpense | null;
  categories: Category[];
  partnerName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidByMe, setPaidByMe] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [prevExpense, setPrevExpense] = useState(expense);
  const [pending, startTransition] = useTransition();

  if (expense !== prevExpense) {
    setPrevExpense(expense);
    if (expense) {
      setName(expense.name);
      setAmount(expense.amount);
      setPaidByMe(expense.paidByMe);
      setCategoryId(expense.categoryId ?? "");
      setOccurredAt(expense.occurredAt);
    }
  }

  function handleSave() {
    if (!expense || !name.trim() || !amount || Number(amount) <= 0) return;
    startTransition(async () => {
      try {
        await updateSharedExpense({
          id: expense.id,
          name: name.trim(),
          amount: Number(amount),
          paidByMe,
          categoryId: categoryId || undefined,
          occurredAt,
        });
        toast.success("已更新");
        onClose();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "更新失敗");
      }
    });
  }

  function handleDelete() {
    if (!expense) return;
    startTransition(async () => {
      try {
        await deleteSharedExpense(expense.id);
        toast.success("已刪除");
        onClose();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "刪除失敗");
      }
    });
  }

  return (
    <Dialog open={!!expense} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>編輯分帳支出</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-shared-name">項目</Label>
            <Input id="edit-shared-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>金額</Label>
              <AmountKeypadField value={amount} onChange={setAmount} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-shared-date">日期</Label>
              <Input
                id="edit-shared-date"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類（選填）</Label>
            <CategoryPickerSheet categories={categories} value={categoryId} onChange={setCategoryId} placeholder="不指定" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>付款人</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaidByMe(true)}
                className={cn(
                  "flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  paidByMe
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                我付的
              </button>
              <button
                type="button"
                onClick={() => setPaidByMe(false)}
                className={cn(
                  "flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  !paidByMe
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {partnerName}付的
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" disabled={pending} onClick={handleDelete}>
            刪除
          </Button>
          <Button onClick={handleSave} disabled={pending || !name.trim() || !amount || Number(amount) <= 0}>
            {pending ? "儲存中…" : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
