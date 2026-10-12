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
import { TypeToggle } from "@/components/record/type-toggle";

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
      try {
        await createCategory({ name: name.trim(), type, icon });
        toast.success(`已新增分類 ${name}`);
        reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "新增分類失敗");
      }
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

          <TypeToggle value={type} onChange={setType} />

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
