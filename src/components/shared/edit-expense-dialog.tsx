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
import { deleteSplitExpense, updateSplitExpense } from "@/app/(app)/shared/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { cn } from "@/lib/utils";
import type { FlatSplitItem } from "@/lib/shared-expenses";

type Category = { id: string; name: string; icon: string | null; color: string | null };

export function EditSplitExpenseDialog({
  item,
  categories,
  onClose,
}: {
  item: FlatSplitItem | null;
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [iOwe, setIOwe] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [prevItem, setPrevItem] = useState(item);
  const [pending, startTransition] = useTransition();

  if (item !== prevItem) {
    setPrevItem(item);
    if (item) {
      setName(item.itemName);
      setCounterpartyName(item.name);
      setAmount(item.amount);
      setIOwe(item.iOwe);
      setCategoryId(item.categoryId ?? "");
      setOccurredAt(item.occurredAt);
    }
  }

  function handleSave() {
    if (!item || !name.trim() || !counterpartyName.trim() || !amount || Number(amount) <= 0) return;
    startTransition(async () => {
      const result = await updateSplitExpense({
        id: item.sharedExpenseId,
        name: name.trim(),
        categoryId: categoryId || undefined,
        occurredAt,
        participants: [{ name: counterpartyName.trim(), amount: Number(amount), iOwe }],
      });
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已更新");
      onClose();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!item) return;
    startTransition(async () => {
      const result = await deleteSplitExpense(item.sharedExpenseId);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已刪除");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
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
              <AmountKeypadField value={amount} onChange={setAmount} allowDecimal={false} />
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
            <Label htmlFor="edit-shared-counterparty">分帳對象</Label>
            <Input
              id="edit-shared-counterparty"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類（選填）</Label>
            <CategoryPickerSheet categories={categories} value={categoryId} onChange={setCategoryId} placeholder="不指定" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>方向</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIOwe(false)}
                className={cn(
                  "flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  !iOwe ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                對方欠我
              </button>
              <button
                type="button"
                onClick={() => setIOwe(true)}
                className={cn(
                  "flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  iOwe ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                我欠對方
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" disabled={pending} onClick={handleDelete}>
            刪除
          </Button>
          <Button
            onClick={handleSave}
            disabled={pending || !name.trim() || !counterpartyName.trim() || !amount || Number(amount) <= 0}
          >
            {pending ? "儲存中…" : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
