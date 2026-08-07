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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBudget } from "@/app/(app)/budgets/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";

type Category = { id: string; name: string };

export function CreateBudgetDialog({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [limitAmount, setLimitAmount] = useState("");
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
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryId">分類</Label>
            <Select
              name="categoryId"
              defaultValue="overall"
              items={{ overall: "整體預算", ...Object.fromEntries(categories.map((c) => [c.id, c.name])) }}
            >
              <SelectTrigger id="categoryId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">整體預算</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>預算上限</Label>
            <AmountKeypadField value={limitAmount} onChange={setLimitAmount} />
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
