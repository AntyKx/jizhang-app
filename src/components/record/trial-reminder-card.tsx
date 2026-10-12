"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, Hourglass, X } from "lucide-react";

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked — it may show again next visit, which is fine.
  }
}

const DISMISSED = "dismissed";

// A heads-up on the trial's last day, and once more after it ends. Each one
// is shown on a single day only: the first view stores that Taipei date, and
// it stays hidden on any later day (or once closed). Informational, not a
// sales card — the way to the upgrade page is a quiet text link. Per
// device; hidden during SSR so it can't flash for someone who's seen it.
export function TrialReminderCard({
  variant,
  storageKey,
  today,
  stats,
}: {
  variant: "ending" | "ended";
  storageKey: string;
  today: string;
  stats: { label: string; value: number }[];
}) {
  const stored = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => read(storageKey),
    () => DISMISSED,
  );
  const firstView = stored === null;

  useEffect(() => {
    if (firstView) write(storageKey, today);
  }, [firstView, storageKey, today]);

  if (!(firstView || stored === today)) return null;

  function dismiss() {
    write(storageKey, DISMISSED);
    listeners.forEach((l) => l());
  }

  const shown = stats.filter((s) => s.value > 0);

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl bg-muted/50 p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="關閉"
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-background/60"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-2 pr-8">
        <Hourglass className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        <span className="text-sm font-semibold">{variant === "ending" ? "試用快結束了" : "試用已經結束"}</span>
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
          ? "結束後會回到免費版，記帳、日曆、預算都能照常用，記過的資料也都會保留。"
          : "現在是免費版，記帳、日曆、預算都能照常用，記過的資料也都在。"}
      </p>

      <Link href="/upgrade" className="flex items-center gap-0.5 self-end text-xs text-muted-foreground">
        看看免費版和解鎖的差別
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}
