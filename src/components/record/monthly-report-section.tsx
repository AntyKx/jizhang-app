import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { monthlyReports } from "@/db/schema";
import { hasCoreAccess } from "@/lib/entitlements";
import { getTodayInTaipei } from "@/lib/date";
import { getPeriodFacts } from "@/lib/period-summary";
import { lastMonthRange, MONTHLY_REPORT_MIN_TX, MONTHLY_REPORT_SHOW_UNTIL_DAY } from "@/lib/monthly-report";
import { MonthlyReportCard } from "@/components/record/monthly-report-card";

// Own Suspense island on /record: 小熊月報 for the month that just ended,
// shown during the first days of the new one. Everyone gets last month's
// numbers; the AI paragraph is the unlocked part (the card fetches and
// caches it on first view, see /api/monthly-report). Outside that window it
// returns before touching the DB.
export async function MonthlyReportSection({ userId }: { userId: string }) {
  if (getTodayInTaipei().getDate() > MONTHLY_REPORT_SHOW_UNTIL_DAY) return null;

  const range = lastMonthRange();
  const [facts, unlocked, [cached]] = await Promise.all([
    getPeriodFacts(userId, range),
    hasCoreAccess(userId),
    db
      .select({ summary: monthlyReports.summary })
      .from(monthlyReports)
      .where(and(eq(monthlyReports.userId, userId), eq(monthlyReports.month, range.startStr))),
  ]);
  if (facts.txCount < MONTHLY_REPORT_MIN_TX) return null;

  return (
    <MonthlyReportCard
      monthKey={range.startStr}
      monthLabel={`${range.start.getMonth() + 1} 月`}
      expense={facts.expense}
      prevExpense={facts.prevExpense}
      topCategory={facts.topCategories[0]?.[0] ?? null}
      unlocked={unlocked}
      initialSummary={unlocked ? (cached?.summary ?? null) : null}
      statsHref={`/stats?range=month&date=${range.startStr}`}
    />
  );
}
