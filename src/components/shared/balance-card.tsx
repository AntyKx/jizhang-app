// Purely display now — settling used to be a single "一鍵結清" button here
// because there was exactly one fixed partner to settle against. With N
// different named counterparties, settling is inherently per-person (see
// PersonGroupCard's own settle button), so this card just shows the
// overall picture.
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
  const headline =
    Math.abs(rounded) < 1
      ? "目前已結清 🎉"
      : rounded > 0
        ? `別人共欠你 NT$${rounded.toLocaleString("zh-TW")}`
        : `你共欠別人 NT$${Math.abs(rounded).toLocaleString("zh-TW")}`;

  const rangeLabel = dateFrom || dateTo ? `${dateFrom ?? "…"} ~ ${dateTo ?? "…"}` : "全部時間";

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card p-5">
      <span className="text-sm text-muted-foreground">結算狀態・{rangeLabel}</span>
      <span className="text-xl font-semibold tabular-nums">{headline}</span>
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
