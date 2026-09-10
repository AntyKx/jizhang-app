"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSplitExpense } from "@/app/(app)/shared/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { todayInTaipeiString } from "@/lib/date";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null };

export function AddSharedExpenseDialog({
  categories,
  frequentSplitNames,
  defaultDate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  categories: Category[];
  frequentSplitNames: string[];
  // Context default from wherever this dialog was opened — e.g. a specific
  // day selected on /calendar. Omitted everywhere else, falls back to today.
  defaultDate?: string;
  // Both omitted (the normal /shared page usage): the dialog manages its
  // own open state, triggered by its own "新增分帳支出" button. Both
  // provided (home page / global FAB usage): the caller owns the open
  // state and supplies its own trigger elsewhere, so the built-in
  // DialogTrigger button is skipped entirely.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [iOwe, setIOwe] = useState(false);
  const [name, setName] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [occurredAt, setOccurredAt] = useState(defaultDate ?? todayInTaipeiString());
  const [pending, setPending] = useState(false);

  // Re-seed the date right when the dialog opens (render-phase state
  // adjustment, same pattern as EditTransactionDialog) rather than on every
  // `defaultDate` change — this component stays mounted across opens (the
  // FAB always renders it), so a plain `defaultValue` on the input would
  // only ever apply once and go stale as the underlying page context (e.g.
  // which calendar day is selected) changes between opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setOccurredAt(defaultDate ?? todayInTaipeiString());
  }

  function reset() {
    setIOwe(false);
    setName("");
    setCounterpartyName("");
    setAmount("");
    setCategoryId("");
    setOccurredAt(defaultDate ?? todayInTaipeiString());
  }

  async function handleSubmit() {
    if (!name.trim() || !counterpartyName.trim() || !amount || Number(amount) <= 0) return;
    setPending(true);
    try {
      await createSplitExpense({
        name: name.trim(),
        categoryId: categoryId || undefined,
        occurredAt,
        participants: [{ name: counterpartyName.trim(), amount: Number(amount), iOwe }],
      });
      setOpen(false);
      reset();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger render={<Button />}>新增分帳支出</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增分帳支出</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="shared-name">項目</Label>
            <Input id="shared-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：晚餐" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>金額</Label>
              <AmountKeypadField value={amount} onChange={setAmount} allowDecimal={false} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shared-occurredAt">日期</Label>
              <Input
                id="shared-occurredAt"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="shared-counterparty">分帳對象</Label>
            <Input
              id="shared-counterparty"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              placeholder="姓名"
              maxLength={30}
            />
            {frequentSplitNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {frequentSplitNames.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCounterpartyName(n)}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
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

          <div className="flex flex-col gap-2">
            <Label>分類（選填）</Label>
            <CategoryPickerSheet categories={categories} value={categoryId} onChange={setCategoryId} placeholder="不指定" />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={pending || !name.trim() || !counterpartyName.trim() || !amount || Number(amount) <= 0}
          >
            {pending ? "新增中…" : "新增"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
