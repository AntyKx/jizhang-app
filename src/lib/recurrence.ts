import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

/** The next occurrence date (as `"yyyy-MM-dd"`) after `dateStr`, stepped forward by one `frequency` interval. */
export function advanceOccurrence(
  dateStr: string,
  frequency: RecurrenceFrequency,
  interval: number,
): string {
  const current = new Date(dateStr);
  const next =
    frequency === "daily"
      ? addDays(current, interval)
      : frequency === "weekly"
        ? addWeeks(current, interval)
        : frequency === "monthly"
          ? addMonths(current, interval)
          : addYears(current, interval);
  return format(next, "yyyy-MM-dd");
}
