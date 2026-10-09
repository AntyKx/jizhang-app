import Link from "next/link";
import { getAdminData, CORE_PRICE_TWD, PLAY_FEE_RATE } from "@/lib/admin/data";
import { AdminHeader, AdminTable, Panel, PlanBadge, StatGrid, StatTile, fmtDate, pct, twd } from "@/components/admin/admin-ui";

const PLATFORM_LABEL: Record<string, string> = { play_store: "Google Play", app_store: "App Store", stripe: "Stripe" };

export default async function AdminPaymentsPage() {
  const { users, generatedAt } = await getAdminData();

  const purchases = users
    .filter((u) => u.corePurchasedAt)
    .sort((a, b) => b.corePurchasedAt!.getTime() - a.corePurchasedAt!.getTime());
  const paid = users.filter((u) => u.plan === "paid");
  const refunded = users.filter((u) => u.plan === "refunded");
  const trial = users.filter((u) => u.plan === "trial");
  // Trial ended without buying — the group the upgrade prompts are for.
  const lapsed = users.filter((u) => u.plan === "free" && u.trialEndsAt);
  const gross = paid.length * CORE_PRICE_TWD;
  const legacySubs = users.filter((u) => u.aiSubscriptionStatus !== "none");

  const funnel = [
    { label: "註冊", n: users.length },
    { label: "記過帳", n: users.filter((u) => u.txTotal > 0).length },
    { label: "記滿 10 筆", n: users.filter((u) => u.txTotal >= 10).length },
    { label: "已解鎖", n: paid.length },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.n));

  return (
    <>
      <AdminHeader
        title="付費"
        description={`核心解鎖 NT$${CORE_PRICE_TWD} 一次買斷。收入為估算值，實際入帳以 Play Console 的財務報表為準。`}
      />

      <StatGrid>
        <StatTile label="已解鎖" value={paid.length} hint={`轉換率 ${pct(paid.length, users.length)}`} />
        <StatTile label="預估總收入" value={twd(gross)} hint={`扣 Play 抽成後 ${twd(gross * (1 - PLAY_FEE_RATE))}`} />
        <StatTile label="試用中" value={trial.length} hint={`試用結束未購買 ${lapsed.length}`} />
        <StatTile label="已退款" value={refunded.length} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="轉換漏斗">
          <ul className="flex flex-col gap-3">
            {funnel.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-muted-foreground">{f.label}</span>
                <span className="h-6 flex-1 rounded-md bg-muted">
                  <span
                    className="block h-full rounded-md bg-primary"
                    style={{ width: `${Math.max(2, (f.n / funnelMax) * 100)}%` }}
                  />
                </span>
                <span className="w-20 shrink-0 text-right tabular-nums">
                  {f.n}
                  <span className="text-xs text-muted-foreground">（{pct(f.n, funnel[0].n)}）</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="試用即將到期（7 天內）">
          {(() => {
            const soon = trial
              .filter((u) => u.trialEndsAt!.getTime() - generatedAt.getTime() < 7 * 86_400_000)
              .sort((a, b) => a.trialEndsAt!.getTime() - b.trialEndsAt!.getTime());
            return soon.length === 0 ? (
              <p className="text-sm text-muted-foreground">沒有</p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {soon.map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-2">
                    <Link href={`/admin/users/${u.id}`} className="truncate hover:underline">
                      {u.name ?? u.email ?? u.id}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtDate(u.trialEndsAt)} 到期・記帳 {u.txTotal} 筆
                    </span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </Panel>
      </div>

      <Panel title="購買紀錄">
        {purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">還沒有任何購買</p>
        ) : (
          <AdminTable head={["日期", "使用者", "管道", "金額", "狀態"]}>
            {purchases.map((u) => (
              <tr key={u.id}>
                <td className="tabular-nums whitespace-nowrap">{fmtDate(u.corePurchasedAt)}</td>
                <td>
                  <Link href={`/admin/users/${u.id}`} className="hover:underline">
                    {u.name ?? u.email ?? u.id}
                  </Link>
                </td>
                <td>{u.corePurchasePlatform ? PLATFORM_LABEL[u.corePurchasePlatform] ?? u.corePurchasePlatform : "—"}</td>
                <td className="tabular-nums">NT${CORE_PRICE_TWD}</td>
                <td>
                  <PlanBadge plan={u.plan} />
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Panel>

      {legacySubs.length > 0 && (
        <Panel title="舊版 AI 訂閱（已停售）">
          <AdminTable head={["使用者", "狀態"]}>
            {legacySubs.map((u) => (
              <tr key={u.id}>
                <td>{u.name ?? u.email ?? u.id}</td>
                <td>{u.aiSubscriptionStatus}</td>
              </tr>
            ))}
          </AdminTable>
        </Panel>
      )}
    </>
  );
}
