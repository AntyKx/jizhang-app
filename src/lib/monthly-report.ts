import { format, subMonths } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { monthlyReports, userSettings } from "@/db/schema";
import { formatDateInTaipei, getTodayInTaipei, todayInTaipeiString } from "@/lib/date";
import { isTrialActive, trialDaysRemaining } from "@/lib/entitlements";
import { resolveStatsRange } from "@/lib/stats/range";
import { TRIAL_DAYS } from "@/lib/trial";
import type { ReportRange } from "@/lib/period-summary";

// 小熊月報 shows during the first days of a month, about the month that just
// ended, once there's enough in it to say something about.
export const MONTHLY_REPORT_SHOW_UNTIL_DAY = 10;
export const MONTHLY_REPORT_MIN_TX = 5;

// 試用報告: a one-off gift a few days before the trial ends, so trial users
// see the AI write-up while it's still theirs — most trials never cross a
// 1st of the month. Deliberately not on the last day, which is the trial
// reminder's.
const TRIAL_REPORT_DAYS_LEFT = { min: 2, max: 4 };

export type ReportKind = "month" | "trial";

export function lastMonthRange() {
  return resolveStatsRange({ range: "month", date: format(subMonths(getTodayInTaipei(), 1), "yyyy-MM-01") });
}

const DAY_MS = 86_400_000;

export function trialReportRange(trialEndsAt: Date): ReportRange {
  const startStr = formatDateInTaipei(new Date(trialEndsAt.getTime() - TRIAL_DAYS * DAY_MS));
  const endStr = todayInTaipeiString();
  const days = Math.round((Date.parse(endStr) - Date.parse(startStr)) / DAY_MS) + 1;
  return { startStr, endStr, end: getTodayInTaipei(), label: `試用的這 ${days} 天` };
}

// Admin preview: the window a trial ending 3 days from now would have.
export function previewTrialReportRange(): ReportRange {
  return trialReportRange(new Date(Date.now() + 3 * DAY_MS));
}

// The trial report's window when this user should see it now, else null.
export async function currentTrialReportRange(userId: string): Promise<ReportRange | null> {
  const [settings] = await db
    .select({ hasPurchasedCore: userSettings.hasPurchasedCore, trialEndsAt: userSettings.trialEndsAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  const trialEndsAt = settings?.trialEndsAt;
  if (!settings || settings.hasPurchasedCore || !trialEndsAt || !isTrialActive(trialEndsAt)) return null;
  const left = trialDaysRemaining(trialEndsAt);
  if (left < TRIAL_REPORT_DAYS_LEFT.min || left > TRIAL_REPORT_DAYS_LEFT.max) return null;
  return trialReportRange(trialEndsAt);
}

export async function getCachedReport(userId: string, kind: ReportKind, startStr: string) {
  const [row] = await db
    .select({ summary: monthlyReports.summary })
    .from(monthlyReports)
    .where(and(eq(monthlyReports.userId, userId), eq(monthlyReports.kind, kind), eq(monthlyReports.month, startStr)));
  return row?.summary ?? null;
}
