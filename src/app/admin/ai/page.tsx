import Link from "next/link";
import { startOfMonth, subDays } from "date-fns";
import { gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsageEvents } from "@/db/schema";
import { getAdminData, getDailyActivity } from "@/lib/admin/data";
import { AI_GROUPS, AI_GROUP_KEYS, aiGroupOf, type AiDay } from "@/lib/admin/ai-groups";
import { monthlyAiLimit, type AiUsageKind } from "@/lib/entitlements";
import { formatDateInTaipei, getTodayInTaipei } from "@/lib/date";
import { AiStackedChart } from "@/components/admin/admin-charts";
import { AdminHeader, AdminTable, Panel, PlanBadge, StatGrid, StatTile } from "@/components/admin/admin-ui";

const DAYS = 30;
// Kinds that are metered against a monthly cap (see getAiUsageStatus).
const METERED: AiUsageKind[] = ["quick_add", "shared_quick_add", "voice_transcribe", "receipt_scan", "monthly_summary"];
const KIND_LABEL: Record<string, string> = {
  quick_add: "一句話記帳",
  shared_quick_add: "分帳一句話",
  voice_transcribe: "語音轉文字",
  receipt_scan: "收據辨識",
  monthly_summary: "AI 摘要",
};

export default async function AdminAiPage() {
  const [{ users }, daily, monthRows] = await Promise.all([
    getAdminData(),
    getDailyActivity(DAYS),
    db
      .select({ userId: aiUsageEvents.userId, kind: aiUsageEvents.kind, n: sql<number>`count(*)::int` })
      .from(aiUsageEvents)
      .where(gte(aiUsageEvents.createdAt, startOfMonth(getTodayInTaipei())))
      .groupBy(aiUsageEvents.userId, aiUsageEvents.kind),
  ]);

  const today = getTodayInTaipei();
  const days = Array.from({ length: DAYS }, (_, i) => formatDateInTaipei(subDays(today, DAYS - 1 - i)));
  const byDay = new Map<string, AiDay>(days.map((day) => [day, { day, text: 0, voice: 0, receipt: 0, summary: 0 }]));
  const groupTotals = { text: 0, voice: 0, receipt: 0, summary: 0 };
  for (const r of daily.ai) {
    const g = aiGroupOf(r.kind);
    const bucket = byDay.get(r.day);
    if (!g || !bucket) continue;
    bucket[g] += r.n;
    groupTotals[g] += r.n;
  }
  const series = [...byDay.values()];
  const total30 = Object.values(groupTotals).reduce((a, b) => a + b, 0);

  // Per-user, per-kind usage this month vs. that user's cap.
  const userBy = new Map(users.map((u) => [u.id, u]));
  const usage = monthRows
    .filter((r) => METERED.includes(r.kind as AiUsageKind))
    .map((r) => {
      const u = userBy.get(r.userId);
      const limit = monthlyAiLimit(r.kind as AiUsageKind, {
        aiSubscribed: u?.aiSubscriptionStatus === "active",
        coreAccess: u?.plan === "paid" || u?.plan === "trial",
      });
      return { ...r, user: u, limit, ratio: r.n / limit };
    })
    .sort((a, b) => b.ratio - a.ratio);
  const nearCap = usage.filter((x) => x.ratio >= 0.8);
  const monthTotal = monthRows.reduce((s, r) => s + r.n, 0);
  const users30 = new Set(users.filter((u) => u.ai30d > 0).map((u) => u.id)).size;

  return (
    <>
      <AdminHeader title="AI 使用" description="每一次成功的 AI 呼叫都會記一筆；失敗或被額度擋下的不算。" />

      <StatGrid>
        <StatTile label="本月次數" value={monthTotal} />
        <StatTile label="近 30 天次數" value={total30} />
        <StatTile label="近 30 天用過的人" value={users30} hint={`共 ${users.length} 人`} />
        <StatTile label="接近或達到額度" value={nearCap.length} hint="本月任一項用掉 80% 以上" />
      </StatGrid>

      <Panel title="每日 AI 使用（近 30 天）">
        <AiStackedChart data={series} />
        {/* Table view of the same chart: carries identity for colors under 3:1 contrast. */}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {AI_GROUP_KEYS.map((k) => (
            <div key={k} className="flex flex-col rounded-xl bg-muted/50 px-3 py-2">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: AI_GROUPS[k].color }} />
                {AI_GROUPS[k].label}
              </dt>
              <dd className="text-lg font-semibold tabular-nums">{groupTotals[k]}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="本月各使用者用量">
        {usage.length === 0 ? (
          <p className="text-sm text-muted-foreground">本月還沒有人使用</p>
        ) : (
          <AdminTable head={["使用者", "方案", "項目", "已用／額度", "用量"]}>
            {usage.map((x) => (
              <tr key={`${x.userId}-${x.kind}`}>
                <td>
                  <Link href={`/admin/users/${x.userId}`} className="hover:underline">
                    {x.user?.name ?? x.user?.email ?? x.userId}
                  </Link>
                </td>
                <td>{x.user && <PlanBadge plan={x.user.plan} />}</td>
                <td>{KIND_LABEL[x.kind] ?? x.kind}</td>
                <td className="tabular-nums">
                  {x.n} / {x.limit}
                </td>
                <td className="w-40">
                  <span className="block h-2 rounded-full bg-muted">
                    <span
                      className={`block h-full rounded-full ${x.ratio >= 1 ? "bg-destructive" : x.ratio >= 0.8 ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, x.ratio * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Panel>
    </>
  );
}
