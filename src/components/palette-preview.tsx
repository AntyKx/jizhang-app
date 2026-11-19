"use client";

import { useEffect } from "react";

// PREVIEW ONLY. Color themes are tried out from /design-preview/themes,
// which stores the choice in localStorage and sets html[data-palette]
// (see globals.css). This re-applies it after a reload or a cold start of
// the app, so the theme being tried stays on while browsing other pages.
// Nobody who hasn't opened the preview page has the key, so for everyone
// else this does nothing.
export const PALETTE_STORAGE_KEY = "jz-palette-preview";

export const PALETTES = [
  { key: "default", name: "焦糖", colors: ["oklch(0.98 0.012 75)", "oklch(0.68 0.19 38)", "oklch(0.94 0.04 90)", "oklch(0.8 0.11 165)"] },
  { key: "matcha", name: "抹茶", colors: ["oklch(0.98 0.012 125)", "oklch(0.6 0.13 140)", "oklch(0.94 0.045 120)", "oklch(0.84 0.1 85)"] },
  { key: "ocean", name: "海洋", colors: ["oklch(0.98 0.01 230)", "oklch(0.6 0.14 245)", "oklch(0.94 0.04 220)", "oklch(0.85 0.09 185)"] },
  { key: "sakura", name: "櫻花", colors: ["oklch(0.98 0.012 355)", "oklch(0.66 0.15 355)", "oklch(0.94 0.035 350)", "oklch(0.85 0.07 300)"] },
  { key: "lavender", name: "薰衣草", colors: ["oklch(0.98 0.01 295)", "oklch(0.58 0.15 290)", "oklch(0.94 0.035 300)", "oklch(0.88 0.09 90)"] },
] as const;

export type PaletteKey = (typeof PALETTES)[number]["key"];

export function applyPalette(key: PaletteKey) {
  const root = document.documentElement;
  if (key === "default") {
    delete root.dataset.palette;
    localStorage.removeItem(PALETTE_STORAGE_KEY);
  } else {
    root.dataset.palette = key;
    localStorage.setItem(PALETTE_STORAGE_KEY, key);
  }
  window.dispatchEvent(new Event(PALETTE_EVENT));
}

const PALETTE_EVENT = "jz-palette-change";

export function subscribePalette(onChange: () => void) {
  window.addEventListener(PALETTE_EVENT, onChange);
  return () => window.removeEventListener(PALETTE_EVENT, onChange);
}

export function readPalette(): PaletteKey {
  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  return PALETTES.find((p) => p.key === stored)?.key ?? "default";
}

export function PalettePreviewApplier() {
  useEffect(() => {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (stored && PALETTES.some((p) => p.key === stored)) {
      document.documentElement.dataset.palette = stored;
    }
  }, []);
  return null;
}
