import { PartyPopper } from "lucide-react";

// Purely display now — settling used to be a single "一鍵結清" button here
// because there was exactly one fixed partner to settle against. Now there
// are two settle entry points depending on the dashboard's view mode: one
// event at a time (依事件 view, SplitEventCard's own button) or netted
// across every event for one counterparty (依對象 view, PersonGroupCard's
// button) — this card just shows the overall picture regardless of which.
export function BalanceCard({
  netBalance,
  owedToMe,
  iOweTotal,
  hasUnsettled,
  dateFrom,
  dateTo,
}: {
  netBalance: number;
  owedToMe: number;
  iOweTotal: number;
  hasUnsettled: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  const rounded = Math.round(netBalance);
  const isSettled = Math.abs(rounded) < 1;
  const headline = isSettled
    ? "目前已結清"
    : rounded > 0
      ? `別人共欠你 NT$${rounded.toLocaleString("zh-TW")}`
      : `你共欠別人 NT$${Math.abs(rounded).toLocaleString("zh-TW")}`;

  const rangeLabel = dateFrom || dateTo ? `${dateFrom ?? "…"} ~ ${dateTo ?? "…"}` : "全部時間";

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card p-5">
      <span className="text-sm text-muted-foreground">結算狀態・{rangeLabel}</span>
      <span className="flex items-center gap-1.5 text-xl font-semibold tabular-nums">
        {headline}
        {isSettled && <PartyPopper className="size-5 text-primary" strokeWidth={1.75} />}
      </span>
      {hasUnsettled && (
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            別人欠你 <span className="font-semibold text-foreground tabular-nums">${owedToMe.toLocaleString("zh-TW")}</span>
          </span>
          <span className="text-muted-foreground">
            你欠別人 <span className="font-semibold text-foreground tabular-nums">${iOweTotal.toLocaleString("zh-TW")}</span>
          </span>
        </div>
      )}
    </div>
  );
}
