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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRecurringRule } from "@/app/(app)/subscriptions/actions";

type Category = { id: string; name: string };

export function CreateRuleDialog({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>新增定期項目</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增定期收支 / 訂閱</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            await createRecurringRule(formData);
            setOpen(false);
            formRef.current?.reset();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">名稱</Label>
            <Input id="name" name="name" placeholder="例：Netflix 訂閱" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">類型</Label>
              <Select
                name="type"
                defaultValue="expense"
                items={{ expense: "支出", income: "收入" }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">金額</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="frequency">頻率</Label>
              <Select
                name="frequency"
                defaultValue="monthly"
                items={{ daily: "每日", weekly: "每週", monthly: "每月", yearly: "每年" }}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">每日</SelectItem>
                  <SelectItem value="weekly">每週</SelectItem>
                  <SelectItem value="monthly">每月</SelectItem>
                  <SelectItem value="yearly">每年</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nextOccurrence">下次日期</Label>
              <Input id="nextOccurrence" name="nextOccurrence" type="date" required />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryId">分類（選填）</Label>
            <Select
              name="categoryId"
              items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="不指定" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isSubscription" className="size-4" />
            這是一項訂閱服務
          </label>

          <Button type="submit">建立</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
