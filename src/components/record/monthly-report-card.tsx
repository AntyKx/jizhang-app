"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, Lock, X } from "lucide-react";
import { BearIllustration } from "@/components/bear-illustration";
import { track } from "@/lib/analytics/track";

const listeners = new Set<() => void>();

function readDismissed(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

// Stands in for the AI paragraph on the locked card. Blurred, but kept
// truthful in case anyone squints: it describes what the report contains.
const LOCKED_TEASER =
  "小熊看過你上個月的每一筆記帳，整理出錢主要花在哪裡、跟前一個月比起來有什麼變化，還有下個月可以留意的小建議。";

// 小熊月報 home card — see MonthlyReportSection. Dismissal is per month and
// per device; hidden during SSR so it can't flash for someone who closed it.
export function MonthlyReportCard({
  monthKey,
  monthLabel,
  expense,
  prevExpense,
  topCategory,
  unlocked,
  initialSummary,
  statsHref,
}: {
  monthKey: string;
  monthLabel: string;
  expense: number;
  prevExpense: number;
  topCategory: string | null;
  unlocked: boolean;
  initialSummary: string | null;
  statsHref: string;
}) {
  const dismissKey = `jizhang:monthly-report:${monthKey}`;
  const dismissed = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => readDismissed(dismissKey),
    () => true,
  );
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);

  const visible = !dismissed;
  const needsFetch = visible && unlocked && !summary;

  useEffect(() => {
    if (visible) track("monthly_report_seen");
  }, [visible]);

  useEffect(() => {
    if (!needsFetch) return;
    let cancelled = false;
    fetch("/api/monthly-report", { method: "POST" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
        if (cancelled) return;
        if (res.ok && body.summary) setSummary(body.summary);
        else setError(body.error && res.status !== 422 && res.status !== 403 ? body.error : "小熊暫時寫不出來，晚點再來看看。");
      })
      .catch(() => {
        if (!cancelled) setError("網路好像不太穩，晚點再來看看。");
      });
    return () => {
      cancelled = true;
    };
  }, [needsFetch]);

  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // Storage blocked — it just shows again next visit.
    }
    listeners.forEach((l) => l());
  }

  const change = prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : null;

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="關閉"
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-background/60"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-3 pr-8">
        <BearIllustration name="ai-analysis" size={44} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{monthLabel}小熊月報</span>
          <span className="text-xs text-muted-foreground">上個月的帳，小熊幫你整理好了</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col rounded-xl bg-background/70 px-3 py-2">
          <span className="text-xs text-muted-foreground">總支出</span>
          <span className="text-base font-semibold tabular-nums">NT$ {Math.round(expense).toLocaleString("zh-TW")}</span>
          {change !== null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              比前一個月{change === 0 ? "持平" : change > 0 ? `多 ${change}%` : `少 ${-change}%`}
            </span>
          )}
        </div>
        {topCategory && (
          <div className="flex flex-1 flex-col rounded-xl bg-background/70 px-3 py-2">
            <span className="text-xs text-muted-foreground">花最多的是</span>
            <span className="truncate text-base font-semibold">{topCategory}</span>
          </div>
        )}
      </div>

      {unlocked ? (
        <div className="rounded-xl bg-background/70 px-3 py-2.5 text-sm leading-relaxed text-pretty">
          {summary ? (
            summary
          ) : error ? (
            <span className="text-muted-foreground">{error}</span>
          ) : (
            <span className="flex flex-col gap-1.5" aria-label="小熊正在整理">
              <span className="h-3.5 w-full animate-pulse rounded bg-muted" />
              <span className="h-3.5 w-11/12 animate-pulse rounded bg-muted" />
              <span className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
            </span>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-background/70">
          <p aria-hidden className="px-3 py-2.5 text-sm leading-relaxed blur-[5px] select-none">
            {LOCKED_TEASER}
          </p>
          <Link
            href="/upgrade?from=monthly-report"
            onClick={() => track("monthly_report_unlock_tap")}
            className="absolute inset-0 flex items-center justify-center gap-1.5 text-sm font-medium text-primary"
          >
            <Lock className="size-4" />
            解鎖看小熊幫你寫的分析
          </Link>
        </div>
      )}

      <Link href={statsHref} className="flex items-center justify-end gap-0.5 text-xs text-muted-foreground">
        看完整統計
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}
