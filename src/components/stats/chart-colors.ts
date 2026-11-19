import { pickCategoryColor } from "@/lib/category-color";

export function getCategoryColor(c: { color: string | null; name: string }): string {
  return c.color ?? pickCategoryColor(c.name);
}

export const OTHER_COLOR = "#898781";
export const INCOME_COLOR = "var(--income)";
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
// The actual stops are CSS vars (--heat-0…4 in globals.css) so each color
// theme can swap in its own hue; the default values are the warm ramp
// described above.
export const SEQUENTIAL_HEATMAP_STEPS = [0, 1, 2, 3, 4].map((i) => `var(--heat-${i})`);

// Text color for a number/label sitting on top of the matching
// SEQUENTIAL_HEATMAP_STEPS index. Explicit per step rather than derived
// from the current theme — the steps themselves are fixed-lightness (not
// theme-relative), so a pale step needs dark text and a deep step needs
// light text in BOTH light and dark mode; inheriting the theme's default
// foreground (which flips light/dark on its own) got this wrong in dark
// mode, where the low-intensity steps' text was nearly unreadable.
export const SEQUENTIAL_HEATMAP_TEXT = [0, 1, 2, 3, 4].map((i) => `var(--heat-text-${i})`);

export function heatmapLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0 || max <= 0) return 0;
  const ratio = amount / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
