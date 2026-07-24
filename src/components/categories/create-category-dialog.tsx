"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { createCategory } from "@/app/(app)/categories/actions";
import { IconPicker } from "@/components/categories/icon-picker";
import { cn } from "@/lib/utils";

export function CreateCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [icon, setIcon] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setType("expense");
    setIcon(null);
  }

  function handleSave() {
    if (!name.trim() || !icon) return;
    startTransition(async () => {
      await createCategory({ name: name.trim(), type, icon });
      toast.success(`已新增分類 ${name}`);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button />}>新增分類</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增分類</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">名稱</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：寵物"
              maxLength={20}
            />
          </div>

          <div className="flex items-center justify-center gap-2 rounded-full bg-muted p-1">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
                type === "expense"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
                type === "income"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              收入
            </button>
          </div>

          <IconPicker
            icon={icon}
            onIconChange={setIcon}
            onBearLabel={(label) => {
              if (!name.trim()) setName(label);
            }}
          />

          <Button onClick={handleSave} disabled={pending || !name.trim() || !icon}>
            {pending ? "建立中…" : "建立分類"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
