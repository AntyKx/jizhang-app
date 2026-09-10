import Link from "next/link";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { CalendarRange, FileSpreadsheet, FileText, Lock } from "lucide-react";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { hasCoreAccess } from "@/lib/entitlements";
import { listSnapshots, retentionCutoff, retentionDaysFor, PAID_RETENTION_DAYS } from "@/lib/backup-snapshots";
import { getTodayInTaipei } from "@/lib/date";
import { buttonVariants } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";
import { CloudSnapshotList } from "@/components/data-export/cloud-snapshot-list";
import { DeleteAllDataDialog } from "@/components/data-export/delete-all-data-dialog";
import { RestoreBackupDialog } from "@/components/data-export/restore-backup-dialog";
import { cn } from "@/lib/utils";

export default async function DataExportPage() {
  const userId = await requireUserId();

  // Formatted CSV/Excel/monthly-report export is a core-unlock feature, and
  // so is how far back the cloud snapshots reach. Everything to do with
  // getting your own data back — downloading a raw backup, restoring from a
  // file, restoring a recent snapshot, deleting everything — stays free for
  // everyone regardless of plan; those are data-subject rights, not paid
  // conveniences (see /api/export/backup/route.ts and deleteAllUserData()'s
  // comments). What the unlock sells is reach, not recovery.
  const unlocked = await hasCoreAccess(userId);

  const [txRows, accountRows, allSnapshots] = await Promise.all([
    db.select({ occurredAt: transactions.occurredAt }).from(transactions).where(eq(transactions.userId, userId)),
    db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId)),
    listSnapshots(userId),
  ]);

  // Filtered to the plan's window so the list matches what restore will
  // actually accept — a snapshot that survived past the window (pruning
  // runs nightly, so one can) would otherwise show a restore button that
  // then refuses.
  const today = getTodayInTaipei();
  const cutoff = retentionCutoff(today, unlocked);
  const snapshots = allSnapshots.filter((s) => s.day >= cutoff);

  const transactionCount = txRows.length;
  const firstDate = txRows.reduce<string | null>(
    (earliest, r) => (earliest === null || r.occurredAt < earliest ? r.occurredAt : earliest),
    null,
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <BackLink href="/more" label="更多功能" />
      <h1 className="text-2xl font-semibold">資料與備份</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">匯出資料</h2>
        {unlocked ? (
          <>
            <a
              href="/api/export/csv"
              className={cn(buttonVariants({ variant: "outline" }), "h-auto w-full justify-start gap-2.5 py-2.5")}
            >
              <FileText className="size-4" strokeWidth={1.75} />
              匯出 CSV（全部交易明細）
            </a>
            <a
              href="/api/export/xlsx"
              className={cn(buttonVariants({ variant: "outline" }), "h-auto w-full justify-start gap-2.5 py-2.5")}
            >
              <FileSpreadsheet className="size-4" strokeWidth={1.75} />
              匯出 Excel（全部交易明細）
            </a>
            <a
              href="/api/export/monthly-report"
              className={cn(buttonVariants({ variant: "outline" }), "h-auto w-full justify-start gap-2.5 py-2.5")}
            >
              <CalendarRange className="size-4" strokeWidth={1.75} />
              匯出本月月報（Excel）
            </a>
          </>
        ) : (
          <Link
            href="/upgrade?from=data-export"
            className="flex items-center gap-2.5 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted"
          >
            <Lock className="size-4 shrink-0" strokeWidth={1.75} />
            資料匯出是核心解鎖功能，點此了解如何解鎖
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">備份與還原</h2>
        <p className="text-sm text-muted-foreground">
          把完整資料（帳戶、交易、預算、目標、訂閱、分帳本）下載成一份檔案。
        </p>
        <a
          href="/api/export/backup"
          className={cn(buttonVariants({ variant: "outline" }), "h-auto w-full justify-start gap-2.5 py-2.5")}
        >
          <FileText className="size-4" strokeWidth={1.75} />
          下載備份檔案
        </a>

        <RestoreBackupDialog />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">雲端自動備份</h2>
        <p className="text-sm text-muted-foreground">
          系統每天自動保存一份快照，誤刪資料或想回到某一天時可以直接還原。
        </p>
        <CloudSnapshotList
          snapshots={snapshots}
          today={format(today, "yyyy-MM-dd")}
          retentionDays={retentionDaysFor(unlocked)}
          paidRetentionDays={PAID_RETENTION_DAYS}
          unlocked={unlocked}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">雲端同步狀態</h2>
        <p className="text-sm text-muted-foreground">
          每筆記帳即時寫入雲端，換手機或重灌後登入同一帳號即可還原。
        </p>
        <div className="flex flex-col divide-y">
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted-foreground">已儲存交易筆數</span>
            <span className="font-semibold">{transactionCount.toLocaleString("zh-TW")} 筆</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted-foreground">帳戶數量</span>
            <span className="font-semibold">{accountRows.length} 個</span>
          </div>
          {firstDate && (
            <div className="flex justify-between py-2 text-sm">
              <span className="text-muted-foreground">最早紀錄</span>
              <span className="font-semibold">{firstDate}</span>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-destructive">危險區域</h2>
        <p className="text-sm text-muted-foreground">
          帳戶、交易、預算、目標、訂閱與分帳本紀錄將永久刪除，無法復原，建議先匯出備份。
        </p>
        <DeleteAllDataDialog />
      </section>
    </div>
  );
}
