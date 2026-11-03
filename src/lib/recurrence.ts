import { addDays, addMonths, addWeeks, format, getDaysInMonth } from "date-fns";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

// Builds a local-time Date from "yyyy-MM-dd" — `new Date("yyyy-MM-dd")`
// parses as UTC midnight, which lands on the previous day in any timezone
// west of UTC once it goes through date-fns' local-time `format`.
function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The day of month a monthly/yearly rule should land on — the day of the date the user picked. */
export function anchorDayOf(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}

/**
 * The next occurrence date (as `"yyyy-MM-dd"`) after `dateStr`, stepped
 * forward by one `frequency` interval.
 *
 * Monthly and yearly steps land on `anchorDay` (clamped to the target
 * month's length) instead of stepping from `dateStr`'s own day. Stepping
 * from the previous occurrence used to make a rule set on the 31st drift
 * permanently: 1/31 → 2/28 → 3/28 → … With the anchor it goes 1/31 → 2/28
 * → 3/31. Rules saved before the anchor existed pass null and keep the old
 * behaviour.
 */
export function advanceOccurrence(
  dateStr: string,
  frequency: RecurrenceFrequency,
  interval: number,
  anchorDay?: number | null,
): string {
  const current = parseDateStr(dateStr);
  if (frequency === "daily") return format(addDays(current, interval), "yyyy-MM-dd");
  if (frequency === "weekly") return format(addWeeks(current, interval), "yyyy-MM-dd");

  const months = frequency === "monthly" ? interval : interval * 12;
  const targetMonth = addMonths(new Date(current.getFullYear(), current.getMonth(), 1), months);
  const day = Math.min(anchorDay ?? current.getDate(), getDaysInMonth(targetMonth));
  return format(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day), "yyyy-MM-dd");
}
