"use client";

import { useRef, useState, useTransition } from "react";
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
import { restoreBackup } from "@/app/(app)/data-export/actions";

const CONFIRM_PHRASE = "取代還原";

export function RestoreBackupDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setConfirmText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRestore() {
    if (!file) return;
    startTransition(async () => {
      try {
        const text = await file.text();
        await restoreBackup(text);
        toast.success("已還原備份");
        setOpen(false);
        router.push("/record");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "還原失敗");
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
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        從備份還原
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>從備份檔案還原</DialogTitle>
          <DialogDescription>
            還原會先清空目前所有帳戶、交易、預算、目標、訂閱與分帳本紀錄，再載入備份檔案的內容——是「取代」不是「合併」，無法復原。請先選擇備份檔案，並在下方輸入「{CONFIRM_PHRASE}」以確認。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="restore-file">備份檔案</Label>
            <Input
              id="restore-file"
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">請選擇你之前從這個頁面下載的備份檔案。</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="restore-confirm" className="sr-only">
              確認文字
            </Label>
            <Input
              id="restore-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
            />
          </div>

          <Button
            variant="destructive"
            disabled={!file || confirmText !== CONFIRM_PHRASE || pending}
            onClick={handleRestore}
          >
            {pending ? "還原中…" : "清空並還原"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
