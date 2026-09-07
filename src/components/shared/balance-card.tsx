"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { settleAllSharedExpenses } from "@/app/(app)/shared/actions";
import { isFail } from "@/lib/action-result";

export function BalanceCard({
  partnerName,
  netBalance,
  hasUnsettled,
  dateFrom,
  dateTo,
}: {
  partnerName: string;
  netBalance: number;
  hasUnsettled: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSettleAll() {
    startTransition(async () => {
      const result = await settleAllSharedExpenses({ from: dateFrom, to: dateTo });
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已標記結清");
      router.refresh();
    });
  }

  const rounded = Math.round(netBalance);
  let headline: string;
  if (Math.abs(rounded) < 1) {
    headline = "目前已結清 🎉";
  } else if (rounded > 0) {
    headline = `${partnerName} 還需給你 NT$${rounded.toLocaleString("zh-TW")}`;
  } else {
    headline = `你還需給 ${partnerName} NT$${Math.abs(rounded).toLocaleString("zh-TW")}`;
  }

  const rangeLabel = dateFrom || dateTo ? `${dateFrom ?? "…"} ~ ${dateTo ?? "…"}` : "全部時間";

  return (
    <div className="flex flex-col gap-3 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-md shadow-foreground/10">
      <span className="text-sm text-muted-foreground">結算狀態・{rangeLabel}</span>
      <span className="text-xl font-semibold tabular-nums">{headline}</span>
      {hasUnsettled && (
        <Button variant="secondary" disabled={pending} onClick={handleSettleAll} className="self-start">
          {pending ? "處理中…" : dateFrom || dateTo ? "一鍵標記此區間已結清" : "一鍵標記已結清"}
        </Button>
      )}
    </div>
  );
}
