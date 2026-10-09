import Link from "next/link";
import { getAdminData, PLAN_LABEL, type PlanStatus } from "@/lib/admin/data";
import { AdminHeader, AdminTable, PlanBadge, relativeDays, fmtDate } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

const planFilters: { value: PlanStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  ...(Object.keys(PLAN_LABEL) as PlanStatus[]).map((p) => ({ value: p, label: PLAN_LABEL[p] })),
];

const sorts = {
  active: { label: "最近活動", key: (u: { lastActiveAt: Date | null }) => u.lastActiveAt?.getTime() ?? 0 },
  signup: { label: "註冊日", key: (u: { createdAt: Date | null }) => u.createdAt?.getTime() ?? 0 },
  tx: { label: "記帳筆數", key: (u: { txTotal: number }) => u.txTotal },
  ai: { label: "本月 AI", key: (u: { aiThisMonth: number }) => u.aiThisMonth },
} as const;
type SortKey = keyof typeof sorts;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; sort?: string }>;
}) {
  const { q = "", plan = "all", sort = "active" } = await searchParams;
  const sortKey: SortKey = sort in sorts ? (sort as SortKey) : "active";
  const { users } = await getAdminData();

  const needle = q.trim().toLowerCase();
  const rows = users
    .filter((u) => plan === "all" || u.plan === plan)
    .filter((u) => !needle || [u.name, u.email, u.id].some((v) => v?.toLowerCase().includes(needle)))
    .sort((a, b) => sorts[sortKey].key(b) - sorts[sortKey].key(a));

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ q, plan, sort: sortKey, ...patch });
    for (const [k, v] of [...p]) if (!v || v === "all") p.delete(k);
    return `/admin/users?${p}`;
  };

  return (
    <>
      <AdminHeader title="使用者" description={`共 ${users.length} 人，目前顯示 ${rows.length} 人`} />

      <div className="flex flex-wrap items-center gap-3">
        <form action="/admin/users" className="flex-1">
          <input type="hidden" name="plan" value={plan} />
          <input type="hidden" name="sort" value={sortKey} />
          <input
            name="q"
            defaultValue={q}
            placeholder="搜尋名稱或 Email"
            className="h-9 w-full max-w-xs rounded-xl border bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
          />
        </form>
        <div className="flex gap-1">
          {planFilters.map((f) => (
            <Link
              key={f.value}
              href={href({ plan: f.value })}
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                plan === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <AdminTable
        head={[
          "使用者",
          "方案",
          ...(Object.keys(sorts) as SortKey[]).map((k) => (
            <Link key={k} href={href({ sort: k })} className={cn("hover:text-foreground", sortKey === k && "font-medium text-foreground")}>
              {sorts[k].label}
              {sortKey === k ? " ↓" : ""}
            </Link>
          )),
          "帳戶",
          "備份",
        ]}
      >
        {rows.map((u) => (
          <tr key={u.id} className="hover:bg-muted/40">
            <td>
              <Link href={`/admin/users/${u.id}`} className="flex flex-col">
                <span className="font-medium hover:underline">{u.name ?? "（無名稱）"}</span>
                <span className="text-xs text-muted-foreground">{u.email ?? u.id}</span>
              </Link>
            </td>
            <td>
              <PlanBadge plan={u.plan} />
            </td>
            <td className="text-xs whitespace-nowrap">{relativeDays(u.lastActiveAt)}</td>
            <td className="text-xs whitespace-nowrap">{fmtDate(u.createdAt)}</td>
            <td className="tabular-nums">
              {u.txTotal}
              <span className="text-xs text-muted-foreground">（30 天 {u.tx30d}）</span>
            </td>
            <td className="tabular-nums">{u.aiThisMonth}</td>
            <td className="tabular-nums">{u.accountCount}</td>
            <td className="text-xs whitespace-nowrap">{u.latestBackupDay ?? "—"}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
