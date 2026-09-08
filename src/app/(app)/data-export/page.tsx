import Link from "next/link";
import { eq } from "drizzle-orm";
import { CalendarRange, FileSpreadsheet, FileText, Lock } from "lucide-react";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { hasCoreAccess } from "@/lib/entitlements";
import { buttonVariants } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";
import { DeleteAllDataDialog } from "@/components/data-export/delete-all-data-dialog";
import { RestoreBackupDialog } from "@/components/data-export/restore-backup-dialog";
import { cn } from "@/lib/utils";

export default async function DataExportPage() {
  const userId = await requireUserId();

  // Formatted CSV/Excel/monthly-report export and restore-from-backup are
  // core-unlock features. Downloading a raw backup and deleting all data
  // stay free for everyone regardless of plan — both are data-subject
  // rights, not paid conveniences (see /api/export/backup/route.ts and
  // deleteAllUserData()'s comments).
  const unlocked = await hasCoreAccess(userId);

  const [txRows, accountRows] = await Promise.all([
    db.select({ occurredAt: transactions.occurredAt }).from(transactions).where(eq(transactions.userId, userId)),
    db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId)),
  ]);

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
          你的資料已經即時同步在雲端，不會因為手機遺失或重灌而不見。這裡讓你把完整資料（帳戶、交易、預算、目標、訂閱、分帳本）下載成一份檔案帶著走。
        </p>
        <a
          href="/api/export/backup"
          className={cn(buttonVariants({ variant: "outline" }), "h-auto w-full justify-start gap-2.5 py-2.5")}
        >
          <FileText className="size-4" strokeWidth={1.75} />
          下載備份檔案
        </a>

        {unlocked ? (
          <RestoreBackupDialog />
        ) : (
          <Link
            href="/upgrade?from=data-export"
            className="flex items-center gap-2.5 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted"
          >
            <Lock className="size-4 shrink-0" strokeWidth={1.75} />
            用備份檔案還原是核心解鎖功能，點此了解如何解鎖
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">雲端同步狀態</h2>
        <p className="text-sm text-muted-foreground">
          你的每一筆記帳都會即時寫入雲端資料庫，不需要手動同步。換手機或重新安裝後，只要用同一個帳號登入，資料就會直接還原。
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
          刪除後所有帳戶、交易、預算、目標、訂閱與分帳本紀錄都會永久移除，無法復原。建議刪除前先匯出一份備份。
        </p>
        <DeleteAllDataDialog />
      </section>
    </div>
  );
}
