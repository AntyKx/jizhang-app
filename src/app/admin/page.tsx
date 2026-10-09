import Link from "next/link";
import { subDays } from "date-fns";
import { getAdminData, getDailyActivity, CORE_PRICE_TWD, PLAY_FEE_RATE } from "@/lib/admin/data";
import { formatDateInTaipei, getTodayInTaipei } from "@/lib/date";
import { DailyBarChart } from "@/components/admin/admin-charts";
import { AdminHeader, Panel, PlanBadge, StatGrid, StatTile, pct, relativeDays, twd } from "@/components/admin/admin-ui";

const DAYS = 30;

function lastDays(n: number) {
  const today = getTodayInTaipei();
  return Array.from({ length: n }, (_, i) => formatDateInTaipei(subDays(today, n - 1 - i)));
}

export default async function AdminOverviewPage() {
  const [{ users, snapshots, generatedAt }, daily] = await Promise.all([getAdminData(), getDailyActivity(DAYS)]);
  const now = generatedAt.getTime();
  const within = (d: Date | null, days: number) => d != null && now - d.getTime() <= days * 86_400_000;
  const today = formatDateInTaipei(getTodayInTaipei());

  const total = users.length;
  const new7 = users.filter((u) => within(u.createdAt, 7)).length;
  const active7 = users.filter((u) => within(u.lastActiveAt, 7)).length;
  const active30 = users.filter((u) => within(u.lastActiveAt, 30)).length;
  const paid = users.filter((u) => u.plan === "paid").length;
  const trial = users.filter((u) => u.plan === "trial").length;
  const aiMonth = users.reduce((s, u) => s + u.aiThisMonth, 0);
  const net = paid * CORE_PRICE_TWD * (1 - PLAY_FEE_RATE);
  const backedUpToday = new Set(snapshots.filter((s) => s.day === today).map((s) => s.userId)).size;
  const latestBackupDay = snapshots.reduce<string | null>((m, s) => (m && m > s.day ? m : s.day), null);

  const days = lastDays(DAYS);
  const txBy = new Map(daily.tx.map((r) => [r.day, r]));
  const signupBy = new Map<string, number>();
  for (const u of users) {
    if (!u.createdAt) continue;
    const d = formatDateInTaipei(u.createdAt);
    signupBy.set(d, (signupBy.get(d) ?? 0) + 1);
  }
  const txSeries = days.map((day) => ({ day, value: txBy.get(day)?.n ?? 0 }));
  const dauSeries = days.map((day) => ({ day, value: txBy.get(day)?.users ?? 0 }));
  const signupSeries = days.map((day) => ({ day, value: signupBy.get(day) ?? 0 }));

  const recent = [...users]
    .filter((u) => u.createdAt)
    .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
    .slice(0, 6);

  return (
    <>
      <AdminHeader title="總覽" description="只有你的帳號看得到。只顯示次數與日期，不顯示任何人的金額或記帳內容。" />

      <StatGrid>
        <StatTile label="使用者總數" value={total} hint={`近 7 天新增 ${new7}`} />
        <StatTile label="近 7 天活躍" value={active7} hint={`近 30 天 ${active30}（${pct(active30, total)}）`} />
        <StatTile label="已解鎖" value={paid} hint={`轉換率 ${pct(paid, total)}・試用中 ${trial}`} />
        <StatTile label="預估淨收入" value={twd(net)} hint={`扣除 Play 抽成 ${PLAY_FEE_RATE * 100}%`} />
        <StatTile label="本月 AI 次數" value={aiMonth} />
        <StatTile label="今天已備份" value={`${backedUpToday} 人`} hint={`最新備份日 ${latestBackupDay ?? "—"}`} />
        <StatTile label="近 30 天記帳筆數" value={txSeries.reduce((s, d) => s + d.value, 0)} />
        <StatTile
          label="完成新手設定"
          value={users.filter((u) => u.onboardedAt).length}
          hint="含上線前就註冊的舊使用者"
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="每日記帳筆數（近 30 天）">
          <DailyBarChart data={txSeries} label="筆數" />
        </Panel>
        <Panel title="每日記帳人數（近 30 天）">
          <DailyBarChart data={dauSeries} label="人數" />
        </Panel>
        <Panel title="每日新註冊（近 30 天）">
          <DailyBarChart data={signupSeries} label="註冊" />
        </Panel>
        <Panel
          title="最近註冊"
          action={
            <Link href="/admin/users" className="text-xs text-primary hover:underline">
              全部使用者
            </Link>
          }
        >
          <ul className="flex flex-col divide-y">
            {recent.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 py-2.5 hover:bg-muted/40">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{u.name ?? u.email ?? u.id}</span>
                    <span className="text-xs text-muted-foreground">註冊 {relativeDays(u.createdAt)}・記帳 {u.txTotal} 筆</span>
                  </span>
                  <PlanBadge plan={u.plan} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
