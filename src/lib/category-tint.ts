// Shared by CategoryPill and CategoryIconBadge so the same category always
// reads as the same tint intensity wherever it shows up in the app.
// A category's own color as foreground (icon / pill text). The palette is
// tuned for the light theme (mid-dark, muted hues), which sinks into the
// dark theme's background — --category-ink-lift (0% light, ~40% dark, see
// globals.css) mixes in white so the same stored color stays readable in
// both without the caller knowing which theme is on.
export function categoryInk(color: string): string {
  return `color-mix(in oklch, ${color}, white var(--category-ink-lift, 0%))`;
}

export function categoryTint(color: string, opacityPct = 16): string {
  return `color-mix(in oklch, ${color} ${opacityPct}%, transparent)`;
}
