"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePartnerName } from "@/app/(app)/shared/actions";

export function PartnerNameDialog({ partnerName }: { partnerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    const name = inputRef.current?.value ?? "";
    startTransition(async () => {
      await updatePartnerName(name);
      toast.success("已更新");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            與 {partnerName} 的分帳本
            <Pencil className="size-3" />
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>另一半的稱呼</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="partner-name">顯示名稱</Label>
          <Input id="partner-name" ref={inputRef} defaultValue={partnerName} placeholder="另一半" maxLength={30} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "儲存中…" : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
