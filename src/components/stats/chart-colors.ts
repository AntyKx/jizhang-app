import { pickCategoryColor } from "@/lib/category-color";

export function getCategoryColor(c: { color: string | null; name: string }): string {
  return c.color ?? pickCategoryColor(c.name);
}

export const OTHER_COLOR = "#898781";
export const INCOME_COLOR = "#059669";
export const EXPENSE_COLOR = "var(--destructive)";
export const SLOT_1_COLOR = "#2a78d6";

// Sequential ramp for magnitude (heatmap) — same warm hue as --primary
// (oklch hue ~38-40) instead of the cold blue this used to be, which read
// as a generic dashboard color completely off the app's warm-cream/coral
// palette. Fixed oklch stops rather than color-mix(var(--primary)) so the
// top of the ramp stays reliably dark enough for the white day-number text
// in both themes, the same way the blue ramp it replaces was hand-tuned.
// Index 0 (no data) is a deliberately pale-but-visible cream, not
// transparent — every day cell reads as one coherent grid of squares
// instead of "colored blobs floating over blank holes".
export const SEQUENTIAL_HEATMAP_STEPS = [
  "oklch(0.96 0.015 60)",
  "oklch(0.92 0.05 40)",
  "oklch(0.8 0.11 40)",
  "oklch(0.58 0.17 37)",
  "oklch(0.38 0.13 34)",
];

// Text color for a number/label sitting on top of the matching
// SEQUENTIAL_HEATMAP_STEPS index. Explicit per step rather than derived
// from the current theme — the steps themselves are fixed-lightness (not
// theme-relative), so a pale step needs dark text and a deep step needs
// light text in BOTH light and dark mode; inheriting the theme's default
// foreground (which flips light/dark on its own) got this wrong in dark
// mode, where the low-intensity steps' text was nearly unreadable.
export const SEQUENTIAL_HEATMAP_TEXT = ["#6b5847", "#4a2f18", "#3a2410", "white", "white"];

export function heatmapLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0 || max <= 0) return 0;
  const ratio = amount / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
