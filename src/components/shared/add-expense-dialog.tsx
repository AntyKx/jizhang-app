"use client";

import { useRef, useState } from "react";
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
import { createSharedExpense } from "@/app/(app)/shared/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { todayInTaipeiString } from "@/lib/date";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null };

export function AddSharedExpenseDialog({
  partnerName,
  categories,
  defaultDate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  partnerName: string;
  categories: Category[];
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
  const [paidByMe, setPaidByMe] = useState(true);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [occurredAt, setOccurredAt] = useState(defaultDate ?? todayInTaipeiString());
  const formRef = useRef<HTMLFormElement>(null);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger render={<Button />}>新增分帳支出</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增分帳支出</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            await createSharedExpense(formData);
            setOpen(false);
            setPaidByMe(true);
            formRef.current?.reset();
            setAmount("");
            setCategoryId("");
            setOccurredAt(defaultDate ?? todayInTaipeiString());
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="paidByMe" value={paidByMe ? "true" : "false"} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="shared-name">項目</Label>
            <Input id="shared-name" name="name" placeholder="例：晚餐" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>金額</Label>
              <AmountKeypadField value={amount} onChange={setAmount} />
              <input type="hidden" name="amount" value={amount} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shared-occurredAt">日期</Label>
              <Input
                id="shared-occurredAt"
                name="occurredAt"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            </div>
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

          <div className="flex flex-col gap-2">
            <Label>分類（選填）</Label>
            <CategoryPickerSheet categories={categories} value={categoryId} onChange={setCategoryId} placeholder="不指定" />
            <input type="hidden" name="categoryId" value={categoryId} />
          </div>

          <Button type="submit" disabled={!amount || Number(amount) <= 0}>
            新增
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
