"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { CategoryIconBadge } from "@/components/category-icon";
import { OTHER_COLOR } from "@/components/stats/chart-colors";
import { unsettleParticipant } from "@/app/(app)/shared/actions";
import { isFail } from "@/lib/action-result";
import { computeNetBalance } from "@/lib/shared-balance";
import { formatDateInTaipei } from "@/lib/date";
import type { FlatSplitItem } from "@/lib/shared-expenses";
import { cn } from "@/lib/utils";

type SettlementRecord = { key: string; settledAt: string | null; items: FlatSplitItem[] };

// One record per settle action: a 依對象 "全部結清" shares a settlementBatchId
// across every item it covered (possibly spanning many events), so those
// collapse into one record; anything settled on its own (依事件's 結清 /
// 一次結清全部) has no batch id and is its own record.
export function groupSettlementRecords(settledItems: FlatSplitItem[]): SettlementRecord[] {
  const byKey = new Map<string, SettlementRecord>();
  for (const item of settledItems) {
    const key = item.settlementBatchId ?? `${item.sharedExpenseId}:${item.participantIndex}`;
    const record = byKey.get(key) ?? { key, settledAt: item.settledAt, items: [] };
    record.items.push(item);
    byKey.set(key, record);
  }
  return [...byKey.values()].sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""));
}

// The 依對象 view's 結清紀錄 — previously that view showed unsettled items
// only, so a counterparty vanished the moment they were settled, with no
// way to see what a settlement had covered or for how much.
export function SettlementHistory({ items }: { items: FlatSplitItem[] }) {
  const records = groupSettlementRecords(items);
  if (records.length === 0) return null;

  return (
    <div className="flex flex-col">
      <span className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">結清紀錄（{records.length}）</span>
      <div className="flex flex-col divide-y">
        {records.map((record) => (
          <SettlementRecordRow key={record.key} record={record} />
        ))}
      </div>
    </div>
  );
}

function SettlementRecordRow({ record }: { record: SettlementRecord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const net = computeNetBalance(record.items);
  const receivedByMe = net >= 0;
  const first = record.items[0];

  function handleRevert() {
    startTransition(async () => {
      const result = await unsettleParticipant(first.sharedExpenseId, first.participantIndex);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      const reverted = result?.reverted ?? record.items.length;
      toast.success(reverted > 1 ? `已復原這次結清（共 ${reverted} 筆）` : "已復原結清");
      router.refresh();
    });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 px-4 py-2.5 text-left">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-foreground">
            {record.settledAt ? formatDateInTaipei(record.settledAt) : "—"} 結清
          </span>
          <span className="text-xs text-muted-foreground">{record.items.length} 筆</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className={cn("text-sm font-semibold tabular-nums", receivedByMe ? "text-emerald-600" : "text-destructive")}>
            NT${Math.round(Math.abs(net)).toLocaleString("zh-TW")}
          </span>
          <span className="text-[11px] text-muted-foreground">{receivedByMe ? "收回" : "付出"}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col divide-y bg-muted/30">
          {record.items.map((item) => (
            <div key={`${item.sharedExpenseId}-${item.participantIndex}`} className="flex items-center gap-2 px-4 py-2">
              <CategoryIconBadge
                icon={item.categoryIcon}
                color={item.categoryColor ?? OTHER_COLOR}
                className="h-5 w-5 shrink-0"
                iconClassName="h-3 w-3"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{item.itemName}</span>
                <span className="text-xs text-muted-foreground">
                  {item.iOwe ? "你欠" : "欠你"}・{item.occurredAt}
                </span>
              </span>
              <span className="shrink-0 text-sm tabular-nums">NT$ {Number(item.amount).toLocaleString("zh-TW")}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end px-4 py-2">
          <Button size="sm" variant="ghost" disabled={pending} onClick={handleRevert}>
            {pending ? "處理中…" : record.items.length > 1 ? `回復這次結清（${record.items.length} 筆）` : "回復結清"}
          </Button>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
