import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { formatBytes, getAdminData } from "@/lib/admin/data";
import { todayInTaipeiString } from "@/lib/date";
import { AdminHeader, AdminTable, Panel, PlanBadge, StatGrid, StatTile } from "@/components/admin/admin-ui";

// The nightly cron (vercel.json, 18:00 UTC = 02:00 Taipei) snapshots every
// user who has an account, dated by the Taipei day. Before ~02:30 Taipei
// the newest expected snapshot is still yesterday's.
function expectedLatestDay() {
  const taipeiHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Taipei", hour: "2-digit", hour12: false }).format(new Date()),
  );
  const today = todayInTaipeiString();
  if (taipeiHour >= 3) return today;
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function AdminBackupsPage() {
  const { users, snapshots } = await getAdminData();
  const expected = expectedLatestDay();
  const latestDay = snapshots.reduce<string | null>((m, s) => (m && m > s.day ? m : s.day), null);

  // Same population the cron uses: anyone with at least one account.
  const covered = users.filter((u) => u.accountCount > 0);
  const onExpected = new Set(snapshots.filter((s) => s.day === expected).map((s) => s.userId));
  const missing = covered.filter((u) => !onExpected.has(u.id));
  const healthy = latestDay === expected && missing.length === 0;
  const totalBytes = snapshots.reduce((s, x) => s + x.size, 0);

  const rows = [...covered].sort((a, b) => (a.latestBackupDay ?? "").localeCompare(b.latestBackupDay ?? ""));

  return (
    <>
      <AdminHeader title="備份" description="每天 02:00（台北）自動為每位有帳戶的使用者存一份雲端快照。免費版保留 7 天、解鎖版保留 30 天。" />

      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
          healthy ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"
        }`}
      >
        {healthy ? (
          <CircleCheck className="size-5 shrink-0 text-emerald-600" />
        ) : (
          <CircleAlert className="size-5 shrink-0 text-destructive" />
        )}
        <span>
          {healthy
            ? `正常：${expected} 的備份已涵蓋全部 ${covered.length} 位使用者。`
            : latestDay !== expected
              ? `異常：最新備份是 ${latestDay ?? "（無）"}，應該要有 ${expected} 的。請到 Vercel 檢查 /api/cron/backup 的執行紀錄。`
              : `異常：${expected} 有 ${missing.length} 位使用者沒有備份（見下表最上面）。`}
        </span>
      </div>

      <StatGrid>
        <StatTile label="最新備份日" value={latestDay ?? "—"} />
        <StatTile label="應備份人數" value={covered.length} hint={`${expected} 已備份 ${covered.length - missing.length}`} />
        <StatTile label="快照總數" value={snapshots.length} />
        <StatTile label="佔用空間" value={formatBytes(totalBytes)} />
      </StatGrid>

      <Panel title="各使用者備份">
        <AdminTable head={["使用者", "方案", "最新備份", "份數", "大小", ""]}>
          {rows.map((u) => {
            const ok = onExpected.has(u.id);
            return (
              <tr key={u.id}>
                <td>
                  <Link href={`/admin/users/${u.id}`} className="hover:underline">
                    {u.name ?? u.email ?? u.id}
                  </Link>
                </td>
                <td>
                  <PlanBadge plan={u.plan} />
                </td>
                <td className="tabular-nums">{u.latestBackupDay ?? "—"}</td>
                <td className="tabular-nums">{u.backupCount}</td>
                <td className="tabular-nums">{formatBytes(u.backupBytes)}</td>
                <td>
                  {ok ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-700">
                      <CircleCheck className="size-3.5" />
                      正常
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <CircleAlert className="size-3.5" />
                      缺少 {expected}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </AdminTable>
      </Panel>
    </>
  );
}
