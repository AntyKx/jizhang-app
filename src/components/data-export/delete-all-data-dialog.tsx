"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAllUserData } from "@/app/(app)/data-export/actions";

const CONFIRM_PHRASE = "刪除所有資料";

export function DeleteAllDataDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteAllUserData();
      toast.success("已刪除所有資料");
      setOpen(false);
      router.push("/record");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmText("");
      }}
    >
      <Button variant="destructive" className="w-full" onClick={() => setOpen(true)}>
        刪除全部資料
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">確定要刪除全部資料嗎？</DialogTitle>
          <DialogDescription>
            這會永久刪除所有帳戶、交易、預算、儲蓄目標、訂閱與分帳本紀錄，無法復原。請在下方輸入「{CONFIRM_PHRASE}」以確認。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirm" className="sr-only">
              確認文字
            </Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
            />
          </div>

          <Button
            variant="destructive"
            disabled={confirmText !== CONFIRM_PHRASE || pending}
            onClick={handleDelete}
          >
            {pending ? "刪除中…" : "永久刪除全部資料"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
