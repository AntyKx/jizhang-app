import {
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { getTodayInTaipei } from "@/lib/date";

export type StatsRangeUnit = "week" | "month" | "year";

export type StatsRange = {
  unit: StatsRangeUnit;
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  label: string;
  dateParam: string;
  prevQuery: string;
  nextQuery: string;
  todayQuery: string;
};

function parseUnit(range?: string): StatsRangeUnit {
  return range === "week" || range === "year" ? range : "month";
}

export function unitBounds(unit: StatsRangeUnit, anchor: Date): { start: Date; end: Date } {
  if (unit === "week") return { start: startOfWeek(anchor, { weekStartsOn: 0 }), end: endOfWeek(anchor, { weekStartsOn: 0 }) };
  if (unit === "year") return { start: startOfYear(anchor), end: endOfYear(anchor) };
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
}

export function shiftAnchor(unit: StatsRangeUnit, anchor: Date, direction: 1 | -1): Date {
  if (unit === "week") return direction === 1 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
  if (unit === "year") return direction === 1 ? addYears(anchor, 1) : subYears(anchor, 1);
  return direction === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1);
}

// Short label for a single bucket start date, used as chart axis ticks.
export function bucketLabel(unit: StatsRangeUnit, start: Date): string {
  if (unit === "week") return format(start, "M/d");
  if (unit === "year") return format(start, "yyyy");
  return format(start, "M月");
}

function unitLabel(unit: StatsRangeUnit, start: Date, end: Date): string {
  if (unit === "week") return `${format(start, "M/d")} - ${format(end, "M/d")}`;
  if (unit === "year") return format(start, "yyyy 年");
  return format(start, "yyyy 年 M 月");
}

export function resolveStatsRange(params: { range?: string; date?: string }): StatsRange {
  const unit = parseUnit(params.range);
  const anchor = params.date
    ? parse(params.date, "yyyy-MM-dd", getTodayInTaipei())
    : getTodayInTaipei();
  const { start, end } = unitBounds(unit, anchor);

  const prevStart = unitBounds(unit, shiftAnchor(unit, start, -1)).start;
  const nextStart = unitBounds(unit, shiftAnchor(unit, start, 1)).start;

  return {
    unit,
    start,
    end,
    startStr: format(start, "yyyy-MM-dd"),
    endStr: format(end, "yyyy-MM-dd"),
    label: unitLabel(unit, start, end),
    dateParam: format(start, "yyyy-MM-dd"),
    prevQuery: `range=${unit}&date=${format(prevStart, "yyyy-MM-dd")}`,
    nextQuery: `range=${unit}&date=${format(nextStart, "yyyy-MM-dd")}`,
    todayQuery: `range=${unit}`,
  };
}
