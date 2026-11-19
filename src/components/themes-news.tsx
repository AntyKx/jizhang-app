"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCoreTrialing, useCoreUnlocked } from "@/components/core-access-context";
import { PALETTES } from "@/components/theme-palette";
import { ThemedBear } from "@/components/themed-bear";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

// Telling existing users about color themes (2026-11): the Android app loads
// the live site, so there's no store update to carry "what's new". Three
// per-device signals, all localStorage:
// - a dot on the 更多 tab and a NEW badge on 帳號設定, until the theme picker
//   has been opened once (SEEN_KEY, set by ThemePicker via markThemesSeen);
// - a one-time announcement sheet for everyone (ANNOUNCED_KEY).
const SEEN_KEY = "jz-news-themes-seen";
const ANNOUNCED_KEY = "jz-news-themes-announced";
const EVENT = "jz-news-themes";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function markThemesSeen() {
  if (localStorage.getItem(SEEN_KEY)) return;
  localStorage.setItem(SEEN_KEY, "1");
  window.dispatchEvent(new Event(EVENT));
}

// false on the server, so nothing NEW is ever in the server HTML.
export function useThemesNew(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !localStorage.getItem(SEEN_KEY),
    () => false,
  );
}

export function ThemesNewDot() {
  const isNew = useThemesNew();
  if (!isNew) return null;
  return <span aria-label="有新功能" className="absolute top-1 right-3 size-2 rounded-full bg-destructive ring-2 ring-card" />;
}

export function ThemesNewBadge() {
  const isNew = useThemesNew();
  if (!isNew) return null;
  return (
    <span className="shrink-0 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
      NEW
    </span>
  );
}

const BEAR_TILE_BG: Record<string, string> = {
  default: "#fde6cf",
  matcha: "#dcebc8",
  ocean: "#cfe7f8",
  sakura: "#fbdbe5",
  lavender: "#e4dbf8",
  night: "#2d3a78",
};

// Mounted in (app)/layout for users past onboarding. Opens once, a moment
// after load (after the cold-start splash), never on the settings page
// itself.
export function ThemesAnnouncement() {
  const unlocked = useCoreUnlocked();
  const trialing = useCoreTrialing();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(ANNOUNCED_KEY) || pathname.startsWith("/account")) return;
    const t = setTimeout(() => {
      if (localStorage.getItem(ANNOUNCED_KEY)) return;
      localStorage.setItem(ANNOUNCED_KEY, "1");
      setOpen(true);
    }, 2500);
    return () => clearTimeout(t);
    // Only the first page of a session matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetContent>
        <div className="flex flex-col items-center gap-1 pt-1 text-center">
          <BottomSheetTitle className="text-lg font-bold">小熊換裝了！</BottomSheetTitle>
          <p className="text-sm text-pretty text-muted-foreground">
            新增 6 款主題配色，整個 App 換顏色，首頁小熊也會換上不同造型。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {PALETTES.map((p) => (
            <div key={p.key} className="flex flex-col items-center gap-1">
              <span
                className="flex aspect-square w-full items-center justify-center rounded-2xl p-2"
                style={{ backgroundColor: BEAR_TILE_BG[p.key] }}
              >
                <ThemedBear variant={p.key} className="size-full" />
              </span>
              <span className="text-xs font-medium">{p.name}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {!unlocked
            ? "焦糖免費使用，其他主題包含在 NT$120 解鎖中。"
            : trialing
              ? "試用期間全部都能用，到「帳號設定」就能換；試用結束後會換回焦糖，解鎖就能繼續使用。"
              : "到「帳號設定」就能換。"}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => {
              setOpen(false);
              router.push("/account#themes");
            }}
          >
            去看看
          </Button>
          <Button size="lg" variant="ghost" onClick={() => setOpen(false)}>
            之後再說
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
