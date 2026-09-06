// Shared by CategoryPill and CategoryIconBadge so the same category always
// reads as the same tint intensity wherever it shows up in the app.
export function categoryTint(color: string, opacityPct = 16): string {
  return `color-mix(in oklch, ${color} ${opacityPct}%, transparent)`;
}
