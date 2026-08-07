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
import { createGoal } from "@/app/(app)/goals/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";

export function CreateGoalDialog() {
  const [open, setOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>新增目標</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增儲蓄目標</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            await createGoal(formData);
            setOpen(false);
            formRef.current?.reset();
            setTargetAmount("");
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">目標名稱</Label>
            <Input id="name" name="name" placeholder="例：日本旅遊基金" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>目標金額</Label>
            <AmountKeypadField value={targetAmount} onChange={setTargetAmount} />
            <input type="hidden" name="targetAmount" value={targetAmount} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="targetDate">目標日期（選填）</Label>
            <Input id="targetDate" name="targetDate" type="date" />
          </div>
          <Button type="submit" disabled={!targetAmount || Number(targetAmount) <= 0}>
            建立
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
