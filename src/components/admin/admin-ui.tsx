import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateInTaipei } from "@/lib/date";
import { PLAN_LABEL, type PlanStatus } from "@/lib/admin/data";

export function AdminHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
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

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <section className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</section>;
}

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const planVariant: Record<PlanStatus, "default" | "secondary" | "outline" | "destructive"> = {
  paid: "default",
  trial: "secondary",
  free: "outline",
  refunded: "destructive",
};

export function PlanBadge({ plan }: { plan: PlanStatus }) {
  return <Badge variant={planVariant[plan]}>{PLAN_LABEL[plan]}</Badge>;
}

// Shared table chrome — horizontal scroll on narrow screens rather than
// squashing columns.
export function AdminTable({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={i} className="py-2 pr-4 font-normal whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:py-2.5 [&_td]:pr-4 [&_tr]:border-b [&_tr:last-child]:border-0">{children}</tbody>
      </table>
    </div>
  );
}

export function fmtDate(d: Date | null | undefined) {
  return d ? formatDateInTaipei(d) : "—";
}

export function relativeDays(d: Date | null | undefined) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 30) return `${days} 天前`;
  return formatDateInTaipei(d);
}

export function pct(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "—";
}

export function twd(n: number) {
  return `NT$${Math.round(n).toLocaleString("zh-TW")}`;
}
