import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { startOfMonth, subDays } from "date-fns";
import { db } from "@/db";
import { userSettings, accounts, transactions, aiUsageEvents, sharedExpenses } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isDevAdmin } from "@/lib/entitlements";
import { getTodayInTaipei, formatDateInTaipei } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const userId = await requireUserId();
  if (!isDevAdmin(userId)) notFound();

  const today = getTodayInTaipei();
  const monthStart = startOfMonth(today);
  const trendStart = subDays(today, 13); // last 14 days, inclusive of today

  const [settingsRows, acctCounts, txStats, aiMonthCounts, sharedCounts, trendRows] = await Promise.all([
    db.select().from(userSettings),
    db
      .select({ userId: accounts.userId, count: sql<number>`count(*)::int` })
      .from(accounts)
      .groupBy(accounts.userId),
    db
      .select({
        userId: transactions.userId,
        total: sql<number>`count(*)::int`,
        thisMonth: sql<number>`count(*) filter (where ${transactions.occurredAt} >= ${monthStart})::int`,
        lastAt: sql<string | null>`max(${transactions.createdAt})`,
      })
      .from(transactions)
      .groupBy(transactions.userId),
    db
      .select({
        userId: aiUsageEvents.userId,
        count: sql<number>`count(*) filter (where ${aiUsageEvents.createdAt} >= ${monthStart})::int`,
      })
      .from(aiUsageEvents)
      .groupBy(aiUsageEvents.userId),
    db
      .select({ userId: sharedExpenses.userId, count: sql<number>`count(*)::int` })
      .from(sharedExpenses)
      .groupBy(sharedExpenses.userId),
    db
      .select({ createdAt: transactions.createdAt })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${trendStart}`),
  ]);

  // Union every table that carries a user_id — user_settings rows are only
  // written lazily (first settings-page visit or webhook), so a brand new
  // account can already have accounts/transactions with no settings row yet.
  const allUserIds = new Set<string>();
  for (const r of settingsRows) allUserIds.add(r.userId);
  for (const r of acctCounts) allUserIds.add(r.userId);
  for (const r of txStats) allUserIds.add(r.userId);

  const settingsByUser = new Map(settingsRows.map((r) => [r.userId, r]));
  const acctByUser = new Map(acctCounts.map((r) => [r.userId, r.count]));
  const txByUser = new Map(txStats.map((r) => [r.userId, r]));
  const aiByUser = new Map(aiMonthCounts.map((r) => [r.userId, r.count]));
  const sharedByUser = new Map(sharedCounts.map((r) => [r.userId, r.count]));

  const userIdList = Array.from(allUserIds);
  const client = await clerkClient();
  // getUserList caps at 100 per call — chunk so users past the first 100
  // still get their name/email instead of silently falling back to raw ids.
  const chunks: string[][] = [];
  for (let i = 0; i < userIdList.length; i += 100) chunks.push(userIdList.slice(i, i + 100));
  const clerkUsers = (
    await Promise.all(chunks.map((ids) => client.users.getUserList({ userId: ids, limit: 100 })))
  ).flatMap((r) => r.data);
  const profileByUser = new Map(
    clerkUsers.map((u) => [
      u.id,
      {
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
        email: u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null,
        lastSignInAt: u.lastSignInAt ? new Date(u.lastSignInAt) : null,
        imageUrl: u.imageUrl,
      },
    ]),
  );

  const rows = userIdList
    .map((id) => {
      const settings = settingsByUser.get(id);
      const tx = txByUser.get(id);
      const profile = profileByUser.get(id);
      return {
        userId: id,
        email: profile?.email ?? null,
        name: profile?.name ?? null,
        lastSignInAt: profile?.lastSignInAt ?? null,
        hasPurchasedCore: settings?.hasPurchasedCore ?? false,
        aiSubscriptionStatus: settings?.aiSubscriptionStatus ?? "none",
        accountCount: acctByUser.get(id) ?? 0,
        txTotal: tx?.total ?? 0,
        txThisMonth: tx?.thisMonth ?? 0,
        aiThisMonth: aiByUser.get(id) ?? 0,
        sharedCount: sharedByUser.get(id) ?? 0,
        lastTxAt: tx?.lastAt ? new Date(tx.lastAt) : null,
      };
    })
    .sort((a, b) => (b.lastTxAt?.getTime() ?? 0) - (a.lastTxAt?.getTime() ?? 0));

  const totalUsers = rows.length;
  const coreUsers = rows.filter((r) => r.hasPurchasedCore).length;
  const activeAiSubs = rows.filter((r) => r.aiSubscriptionStatus === "active").length;
  const totalTx = rows.reduce((sum, r) => sum + r.txTotal, 0);
  const txThisMonth = rows.reduce((sum, r) => sum + r.txThisMonth, 0);
  const aiThisMonth = rows.reduce((sum, r) => sum + r.aiThisMonth, 0);

  // Bucket the last 14 days of transaction creation into per-day counts —
  // done in JS against Taipei wall-clock dates, same rationale as
  // formatDateInTaipei's own doc comment: a raw SQL date_trunc would bucket
  // by the server's UTC day instead.
  const dayBuckets = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    dayBuckets.set(formatDateInTaipei(subDays(today, 13 - i)), 0);
  }
  for (const r of trendRows) {
    const key = formatDateInTaipei(r.createdAt);
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const trend = Array.from(dayBuckets.entries()).map(([day, count]) => ({ day, count }));
  const trendMax = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">後台監控</h1>
        <p className="text-sm text-muted-foreground">
          只有你的帳號看得到這頁——所有使用者的資料、訂閱狀況與使用統計，作為開發依據。
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="總使用者數" value={totalUsers} />
        <StatTile label="已買核心解鎖" value={coreUsers} hint={totalUsers ? `${Math.round((coreUsers / totalUsers) * 100)}%` : undefined} />
        <StatTile label="AI 訂閱中" value={activeAiSubs} />
        <StatTile label="累積交易數" value={totalTx} />
        <StatTile label="本月交易數" value={txThisMonth} />
        <StatTile label="本月 AI 使用次數" value={aiThisMonth} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>近 14 天每日交易筆數</CardTitle>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 280 90" className="h-24 w-full overflow-visible" role="img" aria-label="近 14 天每日交易筆數長條圖">
            {trend.map((t, i) => {
              const barWidth = 14;
              const gap = 6;
              const x = i * (barWidth + gap);
              const maxBarHeight = 64;
              const height = Math.max(2, (t.count / trendMax) * maxBarHeight);
              const y = maxBarHeight - height;
              const showLabel = i % 2 === 0;
              return (
                <g key={t.day}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx={4}
                    fill="var(--chart-1)"
                  >
                    <title>{`${t.day}：${t.count} 筆`}</title>
                  </rect>
                  {showLabel ? (
                    <text
                      x={x + barWidth / 2}
                      y={maxBarHeight + 12}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      fontSize={7}
                    >
                      {t.day.slice(5)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用者清單</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-normal">使用者</th>
                <th className="py-2 pr-3 font-normal">核心解鎖</th>
                <th className="py-2 pr-3 font-normal">AI 訂閱</th>
                <th className="py-2 pr-3 font-normal">帳戶</th>
                <th className="py-2 pr-3 font-normal">累積交易</th>
                <th className="py-2 pr-3 font-normal">本月交易</th>
                <th className="py-2 pr-3 font-normal">本月 AI</th>
                <th className="py-2 pr-3 font-normal">分帳</th>
                <th className="py-2 font-normal">最後使用</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name ?? "（無名稱）"}</span>
                      <span className="text-xs text-muted-foreground">{r.email ?? r.userId}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {r.hasPurchasedCore ? <Badge>已解鎖</Badge> : <Badge variant="outline">未解鎖</Badge>}
                  </td>
                  <td className="py-2 pr-3">
                    {r.aiSubscriptionStatus === "active" ? (
                      <Badge>訂閱中</Badge>
                    ) : r.aiSubscriptionStatus === "past_due" ? (
                      <Badge variant="destructive">逾期</Badge>
                    ) : (
                      <Badge variant="outline">無</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{r.accountCount}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.txTotal}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.txThisMonth}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.aiThisMonth}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.sharedCount}</td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {r.lastTxAt ? formatDateInTaipei(r.lastTxAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
