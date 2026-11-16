"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CategoryIconBadge } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import {
  postAllDueOccurrences,
  postRecurringOccurrence,
  skipRecurringOccurrence,
} from "@/app/(app)/subscriptions/actions";
import { isFail } from "@/lib/action-result";
import { todayInTaipeiString } from "@/lib/date";

// busyId value while 全部入帳 is running — every row's buttons lock then.
const ALL = "all";

export type DueRule = {
  id: string;
  name: string;
  amount: string;
  type: "income" | "expense";
  categoryIcon: string | null;
  categoryColor: string | null;
  nextOccurrence: string;
};

export function DueSubscriptionsCard({ rules }: { rules: DueRule[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (rules.length === 0) return null;
  const today = todayInTaipeiString();

  function handlePost(rule: DueRule) {
    setBusyId(rule.id);
    startTransition(async () => {
      const result = await postRecurringOccurrence(rule.id);
      if (isFail(result)) {
        toast.error(result.error);
      } else {
        toast.success(`已記上「${rule.name}」`);
        router.refresh();
      }
      setBusyId(null);
    });
  }

  function handlePostAll() {
    setBusyId(ALL);
    startTransition(async () => {
      try {
        const { posted, errors } = await postAllDueOccurrences();
        if (posted > 0) toast.success(`已記上 ${posted} 筆定期收支`);
        if (errors.length > 0) toast.error(errors.join("；"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "操作失敗");
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleSkip(rule: DueRule) {
    setBusyId(rule.id);
    startTransition(async () => {
      try {
        await skipRecurringOccurrence(rule.id);
        toast.success(`已略過「${rule.name}」`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "操作失敗");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{rules.length} 筆定期收支到期了</span>
        {(rules.length > 1 || rules.some((r) => r.nextOccurrence < today)) && (
          <Button size="sm" variant="outline" disabled={pending} onClick={handlePostAll}>
            {pending && busyId === ALL ? "入帳中…" : "全部入帳"}
          </Button>
        )}
      </div>
      <div className="flex flex-col divide-y">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 px-4 py-3">
            {/* min-w-0 + truncate: a long rule name used to push the amount
                and both buttons off the right edge on a narrow phone. */}
            <div className="flex min-w-0 items-center gap-2">
              <CategoryIconBadge icon={r.categoryIcon} color={r.categoryColor} className="h-8 w-8" iconClassName="h-4 w-4" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{r.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {r.nextOccurrence}・
                  <span
                    className={r.type === "expense" ? "font-semibold text-destructive tabular-nums" : "font-semibold text-income tabular-nums"}
                  >
                    {r.type === "expense" ? "-" : "+"}
                    {Number(r.amount).toLocaleString("zh-TW")}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={pending && (busyId === r.id || busyId === ALL)}
                onClick={() => handleSkip(r)}
              >
                略過
              </Button>
              <Button size="sm" disabled={pending && (busyId === r.id || busyId === ALL)} onClick={() => handlePost(r)}>
                一鍵入帳
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
