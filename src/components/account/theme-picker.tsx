"use client";

import { useEffect, useSyncExternalStore } from "react";
import { markThemesSeen } from "@/components/themes-news";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { useCoreUnlocked } from "@/components/core-access-context";
import { PALETTES, applyPalette, readPalette, subscribePalette } from "@/components/theme-palette";
import { ThemedBear } from "@/components/themed-bear";
import { cn } from "@/lib/utils";

// 帳號設定 › 主題配色. Every theme is shown to everyone; picking one other
// than 焦糖 needs the NT$120 unlock (locked taps go to /upgrade).
export function ThemePicker() {
  const unlocked = useCoreUnlocked();
  const router = useRouter();
  const selected = useSyncExternalStore(subscribePalette, readPalette, () => null);

  // Opening the picker clears the "new feature" dot/badge (themes-news.tsx).
  // Arriving via /account#themes: the page may still have been loading when
  // the navigation's own scroll ran, so scroll to this section once it's here.
  useEffect(() => {
    markThemesSeen();
    if (window.location.hash === "#themes") {
      document.getElementById("themes")?.scrollIntoView({ block: "start" });
    }
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {PALETTES.map((p) => {
        const active = selected === p.key;
        const locked = !unlocked && p.key !== "default";
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => (locked ? router.push("/upgrade?from=themes") : applyPalette(p.key))}
            aria-pressed={active}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-2 transition-colors",
              active && "border-primary ring-2 ring-ring",
            )}
          >
            {/* A tiny phone: banner with the theme's bear, rows, primary button. */}
            <span
              className="relative flex h-24 w-full flex-col overflow-hidden rounded-xl border"
              style={{ backgroundColor: p.colors[0] }}
            >
              <span
                className="flex h-12 w-full items-center justify-center rounded-b-xl"
                style={{ backgroundColor: p.colors[2] }}
              >
                <ThemedBear variant={p.key} className="size-11" />
              </span>
              <span className="mx-2 mt-2 h-1.5 w-3/4 rounded-full" style={{ backgroundColor: p.colors[3] }} />
              <span className="mx-2 mt-1 h-1.5 w-1/2 rounded-full" style={{ backgroundColor: p.colors[2] }} />
              <span
                className="absolute right-1.5 bottom-1.5 size-4 rounded-full"
                style={{ backgroundColor: p.colors[1] }}
              />
            </span>
            <span className="flex items-center gap-1 text-sm font-medium">
              {locked && <Lock className="size-3 text-muted-foreground" strokeWidth={2.25} />}
              {p.name}
            </span>
            {active && (
              <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
