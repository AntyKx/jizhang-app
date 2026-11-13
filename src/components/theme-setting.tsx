"use client";

import { useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "light", label: "淺色" },
  { key: "dark", label: "深色" },
  { key: "system", label: "跟隨系統" },
] as const;

// 外觀 row on /account. The stored choice lives in localStorage (next-themes),
// so it's per-device, not per-account — same as the OS-level setting it can
// follow. Renders the indicator only after mount: the server can't know the
// stored theme, so the first client render would otherwise mismatch.
const noopSubscribe = () => () => {};

export function ThemeSetting() {
  const { theme, setTheme } = useTheme();
  // false during SSR/hydration, true afterwards — without a setState-in-effect.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const containerRef = useRef<HTMLDivElement>(null);
  const value = mounted ? (theme ?? "light") : null;

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="外觀"
      className="relative isolate flex h-9 shrink-0 items-center gap-1 rounded-lg bg-muted p-1"
    >
      {value && (
        <SlidingIndicator
          activeKey={value}
          containerRef={containerRef}
          className="-z-10 rounded-md bg-primary shadow-[0_4px_10px_-4px_var(--primary)]"
        />
      )}
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          data-key={o.key}
          onClick={() => setTheme(o.key)}
          className={cn(
            "flex h-full items-center justify-center rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
            value === o.key ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
