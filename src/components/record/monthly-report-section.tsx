import { hasCoreAccess } from "@/lib/entitlements";
import { getTodayInTaipei } from "@/lib/date";
import { getPeriodFacts, type PeriodFacts } from "@/lib/period-summary";
import {
  currentTrialReportRange,
  getCachedReport,
  lastMonthRange,
  MONTHLY_REPORT_MIN_TX,
  MONTHLY_REPORT_SHOW_UNTIL_DAY,
  previewTrialReportRange,
} from "@/lib/monthly-report";
import { MonthlyReportCard } from "@/components/record/monthly-report-card";

// Admin-only (see /record): shows a card outside its normal window.
// "locked" forces the free-tier 月報; "trial" fakes a trial ending in 3 days.
export type ReportPreview = "unlocked" | "locked" | "trial";

function changePct(facts: PeriodFacts) {
  if (facts.prevExpense === null || facts.prevExpense <= 0) return null;
  return Math.round(((facts.expense - facts.prevExpense) / facts.prevExpense) * 100);
}

// Own Suspense island on /record, showing at most one report card:
// - 小熊月報 for the month that just ended, during the first days of the new
//   one. Everyone gets the numbers; the AI paragraph is the unlocked part.
// - otherwise, a one-off 試用報告 a few days before the trial ends, so
//   trial users get to see the AI write-up at least once.
// Neither one sells anything — purchase prompts live where the user reaches
// for a paid feature, not on the home page.
export async function MonthlyReportSection({ userId, preview }: { userId: string; preview?: ReportPreview }) {
  const monthWindow = getTodayInTaipei().getDate() <= MONTHLY_REPORT_SHOW_UNTIL_DAY;

  if (preview === "unlocked" || preview === "locked" || (!preview && monthWindow)) {
    const range = lastMonthRange();
    const [facts, hasAccess] = await Promise.all([getPeriodFacts(userId, range), hasCoreAccess(userId)]);
    if (facts.txCount >= MONTHLY_REPORT_MIN_TX) {
      const unlocked = preview === "locked" ? false : hasAccess;
      return (
        <MonthlyReportCard
          kind="month"
          dismissKey={`jizhang:monthly-report:${preview ? `preview-${preview}` : range.startStr}`}
          title={`${range.start.getMonth() + 1} 月小熊月報`}
          subtitle="上個月的帳，小熊幫你整理好了"
          expense={facts.expense}
          changePct={changePct(facts)}
          topCategory={facts.topCategories[0]?.[0] ?? null}
          unlocked={unlocked}
          initialSummary={unlocked ? await getCachedReport(userId, "month", range.startStr) : null}
          statsHref={`/stats?range=month&date=${range.startStr}`}
        />
      );
    }
    if (preview) return null;
  }

  const range = preview === "trial" ? previewTrialReportRange() : await currentTrialReportRange(userId);
  if (!range) return null;
  const facts = await getPeriodFacts(userId, range);
  if (facts.txCount < MONTHLY_REPORT_MIN_TX) return null;

  return (
    <MonthlyReportCard
      kind="trial"
      preview={preview === "trial"}
      dismissKey={`jizhang:trial-report:${preview ? "preview" : range.startStr}`}
      title="送你一份試用報告"
      subtitle={`小熊幫你整理了${range.label}的帳`}
      expense={facts.expense}
      changePct={null}
      topCategory={facts.topCategories[0]?.[0] ?? null}
      unlocked
      // The preview's window is made up, so it never reads a cached row.
      initialSummary={preview ? null : await getCachedReport(userId, "trial", range.startStr)}
      statsHref="/stats"
    />
  );
}
