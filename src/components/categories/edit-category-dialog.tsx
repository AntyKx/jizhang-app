"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCategory } from "@/app/(app)/categories/actions";
import { IconPicker } from "@/components/categories/icon-picker";

type Category = { id: string; name: string; icon: string | null };

export function EditCategoryDialog({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [prevCategory, setPrevCategory] = useState(category);
  const [pending, startTransition] = useTransition();

  if (category !== prevCategory) {
    setPrevCategory(category);
    if (category) {
      setName(category.name);
      setIcon(category.icon);
    }
  }

  function handleSave() {
    if (!category || !name.trim() || !icon) return;
    startTransition(async () => {
      await updateCategory({ id: category.id, name: name.trim(), icon });
      toast.success("已更新分類");
      onClose();
    });
  }

  return (
    <Dialog open={!!category} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>編輯分類</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-category-name">名稱</Label>
            <Input
              id="edit-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
          </div>

          <IconPicker icon={icon} onIconChange={setIcon} />

          <Button onClick={handleSave} disabled={pending || !name.trim() || !icon}>
            {pending ? "儲存中…" : "儲存變更"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
