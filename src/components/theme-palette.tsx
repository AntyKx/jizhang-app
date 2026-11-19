"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { useCoreUnlocked } from "@/components/core-access-context";
import { heroDecoUrl, patternUrl } from "@/lib/theme-decor";

// Color themes (part of the NT$120 unlock). The choice lives in this
// device's localStorage and is applied as html[data-palette] — see
// globals.css for the tokens and src/lib/theme-decor.ts for the motif art.
// The default 焦糖 theme is "no attribute", so locked users and anyone who
// never picked a theme see the app exactly as before. The stored choice is
// kept when access lapses (trial over), so buying brings it straight back.
// The key name dates from the preview phase; kept so testers' picks carry over.
export const PALETTE_STORAGE_KEY = "jz-palette-preview";

export const PALETTES = [
  { key: "default", name: "焦糖", colors: ["oklch(0.98 0.012 75)", "oklch(0.68 0.19 38)", "oklch(0.94 0.04 90)", "oklch(0.8 0.11 165)"] },
  { key: "matcha", name: "抹茶", colors: ["oklch(0.98 0.012 125)", "oklch(0.6 0.13 140)", "#b9d69a", "oklch(0.84 0.1 85)"] },
  { key: "ocean", name: "海洋", colors: ["oklch(0.98 0.01 230)", "oklch(0.6 0.14 245)", "#8ec5ec", "oklch(0.85 0.09 185)"] },
  { key: "sakura", name: "櫻花", colors: ["oklch(0.98 0.012 355)", "oklch(0.6 0.14 350)", "#f5b8ca", "oklch(0.85 0.07 300)"] },
  { key: "lavender", name: "薰衣草", colors: ["oklch(0.98 0.01 295)", "oklch(0.58 0.15 290)", "#c9b6f0", "oklch(0.88 0.09 90)"] },
  { key: "night", name: "星空夜", colors: ["#121830", "#f2c14e", "#2d3a78", "#7fa2ff"] },
] as const;

export type PaletteKey = (typeof PALETTES)[number]["key"];

const PALETTE_EVENT = "jz-palette-change";

function isPaletteKey(v: string | null | undefined): v is PaletteKey {
  return PALETTES.some((p) => p.key === v);
}

// What's on screen right now (the html attribute), not what's stored —
// they differ while access is locked.
function setRootPalette(key: PaletteKey) {
  const root = document.documentElement;
  if (key === "default") delete root.dataset.palette;
  else root.dataset.palette = key;
  window.dispatchEvent(new Event(PALETTE_EVENT));
}

// Picking a theme (only offered while unlocked — see ThemePicker).
export function applyPalette(key: PaletteKey) {
  if (key === "default") localStorage.removeItem(PALETTE_STORAGE_KEY);
  else localStorage.setItem(PALETTE_STORAGE_KEY, key);
  setRootPalette(key);
}

export function subscribePalette(onChange: () => void) {
  window.addEventListener(PALETTE_EVENT, onChange);
  return () => window.removeEventListener(PALETTE_EVENT, onChange);
}

export function readPalette(): PaletteKey {
  const current = document.documentElement.dataset.palette;
  return isPaletteKey(current) ? current : "default";
}

// Brand orange from layout.tsx's viewport.themeColor — what Chrome / an
// installed PWA paints the system status bar with.
const DEFAULT_THEME_COLOR = "#e2874f";

// Any CSS color (oklch included) → #rrggbb, via the canvas, since not every
// browser accepts oklch() in <meta name="theme-color">.
function toHex(color: string): string | null {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

let lastBarsDark: boolean | null = null;

// Keeps everything outside the CSS tokens in step with the palette:
// - the motif art + page pattern URLs (src/lib/theme-decor.ts),
// - the browser/PWA status bar color (the banner's top color instead of the
//   fixed orange),
// - in the Android app, the status bar's clock/battery icons: the bar is
//   transparent there, so with the app in dark mode (or 星空夜) on a phone
//   set to light mode the icons used to come out dark-on-dark.
function syncThemeColor() {
  const root = document.documentElement;
  const palette = root.dataset.palette;
  const dark = root.classList.contains("dark") || palette === "night";

  if (palette) {
    root.style.setProperty("--theme-hero-deco", heroDecoUrl(palette, dark) ?? "none");
    root.style.setProperty("--theme-pattern", patternUrl(palette, dark) ?? "none");
  } else {
    root.style.removeProperty("--theme-hero-deco");
    root.style.removeProperty("--theme-pattern");
  }

  const styles = getComputedStyle(root);
  const color = palette
    ? toHex(styles.getPropertyValue("--hero-a").trim() || styles.getPropertyValue("--secondary").trim())
    : DEFAULT_THEME_COLOR;
  if (color) {
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      if (meta.content !== color) meta.content = color;
    }
  }

  if (Capacitor.isNativePlatform() && lastBarsDark !== dark) {
    lastBarsDark = dark;
    // Dark = light icons. Older app builds without the plugin just reject.
    SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  }
}

// Mounted once in (app)/layout: applies the stored theme when unlocked
// (and drops it when not), and keeps syncThemeColor running.
export function ThemePaletteApplier() {
  const pathname = usePathname();
  const unlocked = useCoreUnlocked();

  useEffect(() => {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
    setRootPalette(unlocked && isPaletteKey(stored) ? stored : "default");
  }, [unlocked]);

  useEffect(() => {
    syncThemeColor();
    // Palette picked, or light/dark switched (next-themes toggles the
    // html class).
    const observer = new MutationObserver(syncThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-palette"] });
    return () => observer.disconnect();
  }, []);

  // Route changes can re-render the head's theme-color back to the default.
  useEffect(() => {
    if (document.documentElement.dataset.palette) syncThemeColor();
  }, [pathname]);

  return null;
}
