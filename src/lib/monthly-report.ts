import { format, subMonths } from "date-fns";
import { getTodayInTaipei } from "@/lib/date";
import { resolveStatsRange } from "@/lib/stats/range";

// The home card shows during the first days of a month, about the month
// that just ended, once there's enough in it to say something about.
export const MONTHLY_REPORT_SHOW_UNTIL_DAY = 10;
export const MONTHLY_REPORT_MIN_TX = 5;

export function lastMonthRange() {
  return resolveStatsRange({ range: "month", date: format(subMonths(getTodayInTaipei(), 1), "yyyy-MM-01") });
}
