// Every hue shares roughly the same saturation/lightness family (warm,
// muted) so a grid of unrelated categories never reads as a rainbow of
// full-saturation chart colors — only the hue varies. Replaces an older
// qualitative chart palette (saturated blue/orange/green/gold/pink/purple/
// red) that worked fine as distinct chart series but looked like an AI
// dashboard once it was reused for category icon tint/foreground colors.
const categoricalPalette = [
  "#C0512A", // warm coral
  "#B8721A", // amber
  "#7A5B96", // dusty purple
  "#3E7686", // dusty teal
  "#4B7A5E", // forest green
  "#B85C6E", // dusty rose
  "#4E5D82", // blue-grey
  "#8A7256", // warm taupe
];

export function pickCategoryColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % categoricalPalette.length;
  }
  return categoricalPalette[hash];
}
