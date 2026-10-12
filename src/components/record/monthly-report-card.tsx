"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
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

// Home report card — 小熊月報 or the one-off 試用報告, see
// MonthlyReportSection. Content only: no price, no buy button. A free user's
// 月報 gets the numbers plus one quiet line about the AI paragraph.
// Dismissal is per report and per device; hidden during SSR so it can't
// flash for someone who closed it.
export function MonthlyReportCard({
  kind,
  preview = false,
  dismissKey,
  title,
  subtitle,
  expense,
  changePct,
  topCategory,
  unlocked,
  initialSummary,
  statsHref,
}: {
  kind: "month" | "trial";
  preview?: boolean;
  dismissKey: string;
  title: string;
  subtitle: string;
  expense: number;
  changePct: number | null;
  topCategory: string | null;
  unlocked: boolean;
  initialSummary: string | null;
  statsHref: string;
}) {
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
    if (visible) track(kind === "trial" ? "trial_report_seen" : "monthly_report_seen");
  }, [visible, kind]);

  useEffect(() => {
    if (!needsFetch) return;
    let cancelled = false;
    fetch("/api/monthly-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, preview }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
        if (cancelled) return;
        if (res.ok && body.summary) setSummary(body.summary);
        // 429/502 carry a user-facing message; anything else gets the generic one.
        else
          setError(
            (res.status === 429 || res.status === 502) && body.error ? body.error : "小熊暫時寫不出來，晚點再來看看。",
          );
      })
      .catch(() => {
        if (!cancelled) setError("網路好像不太穩，晚點再來看看。");
      });
    return () => {
      cancelled = true;
    };
  }, [needsFetch, kind, preview]);

  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // Storage blocked — it just shows again next visit.
    }
    listeners.forEach((l) => l());
  }

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
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col rounded-xl bg-background/70 px-3 py-2">
          <span className="text-xs text-muted-foreground">總支出</span>
          <span className="text-base font-semibold tabular-nums">NT$ {Math.round(expense).toLocaleString("zh-TW")}</span>
          {changePct !== null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              比前一個月{changePct === 0 ? "持平" : changePct > 0 ? `多 ${changePct}%` : `少 ${-changePct}%`}
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
        <p className="text-xs text-muted-foreground">解鎖後，小熊每個月會幫你寫一段分析。</p>
      )}

      <Link href={statsHref} className="flex items-center justify-end gap-0.5 text-xs text-muted-foreground">
        看完整統計
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}
