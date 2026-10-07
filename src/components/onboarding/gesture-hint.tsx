"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// A one-time tip that sits right under the element it's teaching about
// (e.g. the first transaction row), shown the first time that element
// appears and never again once dismissed. The little caret points up at
// the element so it's clear which thing the tip refers to.
export function GestureHint({
  icon,
  children,
  onDismiss,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div role="note" className={cn("relative mt-2 animate-in fade-in slide-in-from-top-1 duration-300", className)}>
      <span className="absolute -top-1.5 left-8 size-3 rotate-45 rounded-[2px] bg-foreground" aria-hidden />
      <div className="relative flex items-center gap-2.5 rounded-2xl bg-foreground py-2.5 pl-3 pr-2 text-sm text-background shadow-lg">
        <span className="shrink-0 opacity-90">{icon}</span>
        <span className="min-w-0 flex-1 text-pretty">{children}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-background/80 hover:bg-background/10"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

const HINT_STORAGE_PREFIX = "jizhang:hint-dismissed:";
const hintListeners = new Set<() => void>();

function readDismissed(id: string) {
  try {
    return window.localStorage.getItem(HINT_STORAGE_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

function subscribeHints(onChange: () => void) {
  hintListeners.add(onChange);
  return () => {
    hintListeners.delete(onChange);
  };
}

// GestureHint that shows until dismissed once on this device. Remembered in
// localStorage rather than the DB: re-seeing a tip after reinstalling is
// harmless, and it keeps every hint free of a server round trip. Hidden
// during SSR (getServerSnapshot = dismissed) so it can't flash for users
// who already dismissed it.
export function OneTimeHint({
  id,
  icon,
  children,
  className,
}: {
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const dismissed = useSyncExternalStore(
    subscribeHints,
    () => readDismissed(id),
    () => true,
  );
  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(HINT_STORAGE_PREFIX + id, "1");
    } catch {
      // Storage blocked — the hint just comes back next visit.
    }
    hintListeners.forEach((l) => l());
  }

  return (
    <GestureHint icon={icon} onDismiss={dismiss} className={className}>
      {children}
    </GestureHint>
  );
}
