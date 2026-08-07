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
