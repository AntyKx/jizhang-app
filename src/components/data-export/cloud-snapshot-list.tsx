"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CollapsibleProgressList } from "@/components/stats/collapsible-progress-list";
import { restoreFromSnapshot } from "@/app/(app)/data-export/actions";
import { isFail } from "@/lib/action-result";
import type { Snapshot } from "@/lib/backup-snapshots";

const CONFIRM_PHRASE = "取代還原";
const VISIBLE_COUNT = 3;

function relativeLabel(day: string, today: string): string | null {
  if (day === today) return "今天";
  const diff = Math.round(
    (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${day}T00:00:00Z`).getTime()) / 86_400_000,
  );
  if (diff === 1) return "昨天";
  if (diff > 1) return `${diff} 天前`;
  return null;
}

export function CloudSnapshotList({
  snapshots,
  today,
  retentionDays,
  paidRetentionDays,
  unlocked,
}: {
  snapshots: Snapshot[];
  today: string;
  retentionDays: number;
  paidRetentionDays: number;
  unlocked: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Snapshot | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  function handleRestore() {
    if (!selected) return;
    startTransition(async () => {
      const result = await restoreFromSnapshot(selected.day);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success(`已還原到 ${selected.day} 的備份`);
      setSelected(null);
      router.push("/record");
      router.refresh();
    });
  }

  if (snapshots.length === 0) {
    return (
      <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
        還沒有雲端備份，系統每天凌晨自動備份一次。
      </p>
    );
  }

  const items = snapshots.map((s) => {
    const rel = relativeLabel(s.day, today);
    return {
      key: s.day,
      node: (
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium tabular-nums">{s.day}</span>
            <span className="text-xs text-muted-foreground">
              {rel ? `${rel}・` : ""}
              {(s.size / 1024).toFixed(0)} KB
            </span>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setSelected(s);
              setConfirmText("");
            }}
          >
            還原
          </Button>
        </div>
      ),
    };
  });

  return (
    <>
      <CollapsibleProgressList items={items} visibleCount={VISIBLE_COUNT} gapClassName="gap-2" />

      <p className="text-xs text-muted-foreground">
        每天凌晨自動備份，保留最近 {retentionDays} 天。
        {!unlocked && (
          <>
            {" "}
            <Link href="/upgrade?from=data-export" className="text-primary underline underline-offset-2">
              解鎖後可回到 {paidRetentionDays} 天前
            </Link>
          </>
        )}
      </p>

      <Dialog
        open={selected !== null}
        onOpenChange={(v) => {
          if (!v) {
            setSelected(null);
            setConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudDownload className="size-4" strokeWidth={1.75} />
              還原到 {selected?.day}
            </DialogTitle>
            <DialogDescription>
              這會把目前所有帳戶、交易、預算、目標、訂閱與分帳本紀錄，整個換成 {selected?.day}{" "}
              當天備份的內容——是「取代」不是「合併」。這一天之後新增的紀錄都會消失，且無法復原。請輸入「{CONFIRM_PHRASE}」以確認。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
            />
            <Button
              variant="destructive"
              disabled={confirmText !== CONFIRM_PHRASE || pending}
              onClick={handleRestore}
            >
              {pending ? "還原中…" : "清空並還原到這一天"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
