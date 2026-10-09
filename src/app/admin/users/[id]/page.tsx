import Link from "next/link";
import { notFound } from "next/navigation";
import { subDays } from "date-fns";
import { and, eq, gte, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { aiUsageEvents, transactions } from "@/db/schema";
import { formatBytes, getAdminData, CORE_PRICE_TWD } from "@/lib/admin/data";
import { formatDateInTaipei, getTodayInTaipei } from "@/lib/date";
import { DailyBarChart } from "@/components/admin/admin-charts";
import { AdminTable, Panel, PlanBadge, StatGrid, StatTile, fmtDate, relativeDays } from "@/components/admin/admin-ui";

const AI_KIND_LABEL: Record<string, string> = {
  quick_add: "一句話記帳",
  receipt_scan: "收據辨識",
  shared_quick_add: "分帳一句話",
  monthly_summary: "AI 摘要",
  voice_transcribe: "語音轉文字",
};

const PLATFORM_LABEL: Record<string, string> = { play_store: "Google Play", app_store: "App Store", stripe: "Stripe" };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { users, snapshots } = await getAdminData();
  const u = users.find((x) => x.id === id);
  if (!u) notFound();

  const since = subDays(getTodayInTaipei(), 29);
  const [txDaily, aiKinds] = await Promise.all([
    db.execute<{ day: string; n: number }>(sql`
      select to_char((created_at at time zone 'UTC') at time zone 'Asia/Taipei', 'YYYY-MM-DD') as day, count(*)::int as n
      from ${transactions} where user_id = ${id} and created_at >= ${since} group by 1`),
    db
      .select({ kind: aiUsageEvents.kind, n: sql<number>`count(*)::int` })
      .from(aiUsageEvents)
      .where(and(eq(aiUsageEvents.userId, id), gte(aiUsageEvents.createdAt, since)))
      .groupBy(aiUsageEvents.kind),
  ]);

  const txBy = new Map(txDaily.rows.map((r) => [r.day, r.n]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const day = formatDateInTaipei(subDays(getTodayInTaipei(), 29 - i));
    return { day, value: txBy.get(day) ?? 0 };
  });
  const userSnaps = snapshots.filter((s) => s.userId === id).sort((a, b) => (a.day < b.day ? 1 : -1));

  return (
    <>
      <Link href="/admin/users" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        使用者
      </Link>

      <div className="flex items-center gap-4">
        {u.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.imageUrl} alt="" className="size-14 rounded-full object-cover" />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold">{u.name ?? "（無名稱）"}</h1>
            <PlanBadge plan={u.plan} />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {u.email ?? "—"}・<span className="font-mono text-xs">{u.id}</span>
          </p>
        </div>
      </div>

      <StatGrid>
        <StatTile label="註冊" value={fmtDate(u.createdAt)} hint={`最後活動 ${relativeDays(u.lastActiveAt)}`} />
        <StatTile label="記帳筆數" value={u.txTotal} hint={`近 30 天 ${u.tx30d}・最後 ${relativeDays(u.lastTxAt)}`} />
        <StatTile label="本月 AI 次數" value={u.aiThisMonth} hint={`近 30 天 ${u.ai30d}`} />
        <StatTile label="雲端備份" value={`${u.backupCount} 份`} hint={`最新 ${u.latestBackupDay ?? "—"}・${formatBytes(u.backupBytes)}`} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="每日記帳筆數（近 30 天）">
          <DailyBarChart data={series} label="筆數" />
        </Panel>

        <Panel title="方案與付款">
          <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">目前方案</dt>
            <dd>
              <PlanBadge plan={u.plan} />
            </dd>
            <dt className="text-muted-foreground">試用到期</dt>
            <dd>{fmtDate(u.trialEndsAt)}</dd>
            <dt className="text-muted-foreground">購買日</dt>
            <dd>{fmtDate(u.corePurchasedAt)}</dd>
            <dt className="text-muted-foreground">購買管道</dt>
            <dd>{u.corePurchasePlatform ? PLATFORM_LABEL[u.corePurchasePlatform] ?? u.corePurchasePlatform : "—"}</dd>
            <dt className="text-muted-foreground">金額</dt>
            <dd>{u.corePurchasedAt ? `NT$${CORE_PRICE_TWD}${u.plan === "refunded" ? "（已退款）" : ""}` : "—"}</dd>
            <dt className="text-muted-foreground">舊版 AI 訂閱</dt>
            <dd>{u.aiSubscriptionStatus === "none" ? "—" : u.aiSubscriptionStatus}</dd>
            <dt className="text-muted-foreground">新手設定</dt>
            <dd>{u.onboardedAt ? fmtDate(u.onboardedAt) : "未完成"}</dd>
          </dl>
        </Panel>

        <Panel title="功能使用">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ["帳戶", u.accountCount],
              ["預算", u.budgetCount],
              ["儲蓄目標", u.goalCount],
              ["固定收支", u.recurringCount],
              ["分帳", u.sharedCount],
            ].map(([label, n]) => (
              <div key={label} className="flex flex-col rounded-xl bg-muted/50 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="AI 使用（近 30 天）">
          {aiKinds.length === 0 ? (
            <p className="text-sm text-muted-foreground">沒有使用紀錄</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {aiKinds.map((k) => (
                <li key={k.kind} className="flex justify-between py-2">
                  <span>{AI_KIND_LABEL[k.kind] ?? k.kind}</span>
                  <span className="tabular-nums">{k.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="雲端備份">
        {userSnaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">沒有備份</p>
        ) : (
          <AdminTable head={["日期", "大小", "上傳時間"]}>
            {userSnaps.map((s) => (
              <tr key={s.day}>
                <td className="tabular-nums">{s.day}</td>
                <td className="tabular-nums">{formatBytes(s.size)}</td>
                <td className="text-xs text-muted-foreground">{s.uploadedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Panel>
    </>
  );
}
