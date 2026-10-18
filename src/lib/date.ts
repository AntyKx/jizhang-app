const APP_TIME_ZONE = "Asia/Taipei";

/**
 * "Today" as a Date, anchored to the app's fixed timezone (Asia/Taipei)
 * rather than the runtime's local timezone. Server code runs in UTC on
 * Vercel, so a plain `new Date()` / `.toISOString()` is up to a full day
 * behind Taiwan wall-clock time for the ~8 hours after midnight Taipei time
 * (still afternoon/evening UTC the previous day). The returned Date is
 * constructed via the runtime's own local-timezone constructor, so date-fns
 * functions (which read local getters) treat it correctly regardless of
 * where this code executes — server or browser.
 */
export function getTodayInTaipei(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);

  return new Date(year, month - 1, day);
}

/** `getTodayInTaipei()` formatted as `"yyyy-MM-dd"`. */
export function todayInTaipeiString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(new Date());
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/**
 * `"yyyy-MM-dd（星期X）"` for AI prompts. Without the weekday the model
 * guesses which day "上週五" / "這週一" is and gets it wrong.
 */
export function withWeekday(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${ymd}（星期${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`;
}

/**
 * This week and last week (Monday-first) with weekdays, for AI prompts:
 * "這週：2026-10-12（一）…；上週：2026-10-05（一）…". Even when told today's
 * weekday, the model can't do the arithmetic for "上週五" / "這週一" — a
 * labelled table it can read off works.
 */
export function recentDaysForPrompt(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const todayUtc = Date.UTC(y, m - 1, d);
  const sinceMonday = (new Date(todayUtc).getUTCDay() + 6) % 7;
  const week = (offsetWeeks: number) =>
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(todayUtc + (i - sinceMonday + offsetWeeks * 7) * 86_400_000);
      const label = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      return `${label}（${WEEKDAYS[date.getUTCDay()]}）`;
    }).join("、");
  return `這週：${week(0)}；上週：${week(-1)}`;
}

/**
 * Coerces a model-produced date to `"yyyy-MM-dd"`, or returns `fallback`.
 * Models sometimes add a time ("2026-10-17T18:32:00") or use slashes, and
 * `<input type="date">` shows such a value as blank.
 */
export function normalizeAiDate(value: unknown, fallback: string): string {
  const m = typeof value === "string" ? value.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/) : null;
  if (!m) return fallback;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return fallback;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Formats an arbitrary instant as `"HH:mm"` in Taipei wall-clock time. */
export function formatTimeInTaipei(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(typeof date === "string" ? new Date(date) : date);
}

/**
 * Formats an arbitrary instant (e.g. a `timestamp` column like
 * `accounts.createdAt`) as `"yyyy-MM-dd"` in Taipei wall-clock time — the
 * same-rationale counterpart to `todayInTaipeiString()` for dates other than
 * "now". Never use `date-fns`'s `format()` directly on a raw DB timestamp;
 * it reads the runtime's local timezone (UTC on Vercel), not Taipei's.
 */
export function formatDateInTaipei(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(
    typeof date === "string" ? new Date(date) : date,
  );
}

/**
 * Current instant, but with its wall-clock Y/M/D/h/m/s read in Taipei time
 * rather than the runtime's local timezone — same rationale as
 * `getTodayInTaipei()`, extended with time-of-day for greeting text.
 */
export function getNowInTaipei(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
}
