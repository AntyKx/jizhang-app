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
import { Label } from "@/components/ui/label";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { createBudget } from "@/app/(app)/budgets/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";

type Category = { id: string; name: string; icon: string | null; color: string | null };

export function CreateBudgetDialog({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [limitAmount, setLimitAmount] = useState("");
  // "" = overall budget (createBudget treats a missing categoryId as overall).
  const [categoryId, setCategoryId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>新增預算</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增本月預算</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            await createBudget(formData);
            setOpen(false);
            formRef.current?.reset();
            setLimitAmount("");
            setCategoryId("");
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label>分類</Label>
            <CategoryPickerSheet
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              emptyLabel="整體預算"
            />
            <input type="hidden" name="categoryId" value={categoryId} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>預算上限</Label>
            <AmountKeypadField value={limitAmount} onChange={setLimitAmount} allowDecimal={false} label={`${categories.find((c) => c.id === categoryId)?.name ?? "整體"}預算上限`} />
            <input type="hidden" name="limitAmount" value={limitAmount} />
          </div>
          <Button type="submit" disabled={!limitAmount || Number(limitAmount) <= 0}>
            建立
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
