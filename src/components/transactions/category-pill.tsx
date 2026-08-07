// Colored category "pill" badge, inspired by Copilot Money's category tags,
// using the category's own `categoryColor` instead of a fixed accent so
// each category still reads as visually distinct. Used by
// `TodayTransactionRow` (record page's today-list, and the calendar's
// day-detail list, which reuses that same component).
export function CategoryPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
    >
      {name}
    </span>
  );
}
