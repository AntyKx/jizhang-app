"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CategoryIconBadge } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { postRecurringOccurrence, skipRecurringOccurrence } from "@/app/(app)/subscriptions/actions";
import { isFail } from "@/lib/action-result";

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
      <span className="text-sm font-medium text-muted-foreground">
        {rules.length} 筆定期收支到期了
      </span>
      <div className="flex flex-col divide-y">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <CategoryIconBadge icon={r.categoryIcon} color={r.categoryColor} className="h-8 w-8" iconClassName="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.nextOccurrence}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={
                  r.type === "expense"
                    ? "text-sm font-semibold text-destructive tabular-nums"
                    : "text-sm font-semibold text-emerald-600 tabular-nums"
                }
              >
                {r.type === "expense" ? "-" : "+"}
                {Number(r.amount).toLocaleString("zh-TW")}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending && busyId === r.id}
                onClick={() => handleSkip(r)}
              >
                略過
              </Button>
              <Button size="sm" disabled={pending && busyId === r.id} onClick={() => handlePost(r)}>
                一鍵入帳
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
