import { pickCategoryColor } from "@/lib/category-color";

export function getCategoryColor(c: { color: string | null; name: string }): string {
  return c.color ?? pickCategoryColor(c.name);
}

export const OTHER_COLOR = "#898781";
export const INCOME_COLOR = "#059669";
export const EXPENSE_COLOR = "var(--destructive)";
export const SLOT_1_COLOR = "#2a78d6";

// Fixed identity pair for "you" vs "partner" in the shared-ledger trend chart
// — deliberately not INCOME_COLOR/EXPENSE_COLOR, which already carry a
// distinct income/expense meaning elsewhere in the app.
export const ME_COLOR = SLOT_1_COLOR;
export const PARTNER_COLOR = "#eb6834";

// Sequential blue ramp for magnitude (heatmap), kept visually distinct from the
// categorical palette used for identity (category/payment-method colors).
export const SEQUENTIAL_HEATMAP_STEPS = [
  "var(--muted)",
  "#cfe0f7",
  "#8fb8ea",
  "#4a8ad9",
  "#1d5fa8",
];

export function heatmapLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0 || max <= 0) return 0;
  const ratio = amount / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
