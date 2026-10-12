"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Hourglass, X } from "lucide-react";

const listeners = new Set<() => void>();

function readDismissed(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

// Home-page nudge near the end of the trial (≤3 days left) and once more
// right after it ends. Dismissal is per device: while the trial is still
// running the key is per day, so it comes back tomorrow; the "ended" card's
// key is per trial, so it's gone for good once closed. Hidden during SSR so
// it can't flash for someone who already dismissed it.
export function TrialReminderCard({
  variant,
  daysLeft,
  dismissKey,
  stats,
}: {
  variant: "ending" | "ended";
  daysLeft: number;
  dismissKey: string;
  stats: { label: string; value: number }[];
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
  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // Storage blocked — it just shows again next visit.
    }
    listeners.forEach((l) => l());
  }

  const shown = stats.filter((s) => s.value > 0);

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="關閉"
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-background/60"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-2 pr-8">
        <Hourglass className="size-4 shrink-0 text-amber-700" strokeWidth={2} />
        <span className="text-sm font-semibold text-amber-800">
          {variant === "ending" ? `試用還剩 ${daysLeft} 天` : "試用已結束"}
        </span>
      </div>

      {shown.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">試用期間你：</span>
          <div className="flex gap-2">
            {shown.map((s) => (
              <div key={s.label} className="flex flex-1 flex-col rounded-xl bg-background/70 px-3 py-2">
                <span className="text-lg font-semibold tabular-nums">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-pretty text-muted-foreground">
        {variant === "ending"
          ? "到期後多帳戶、進階統計、小熊月報分析、匯出、新增分帳會鎖起來，記過的資料都會保留。"
          : "多帳戶、進階統計、小熊月報分析、匯出、新增分帳已經鎖起來了，記過的資料都還在。"}
      </p>

      <Link
        href="/upgrade"
        className="flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground active:bg-primary/80"
      >
        NT$120 一次買斷，永久解鎖
      </Link>
    </div>
  );
}
