import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { monthlyReports } from "@/db/schema";
import { getAiUsageStatus, hasCoreAccess, isDevAdmin, recordAiUsage } from "@/lib/entitlements";
import { generatePeriodSummary, getPeriodFacts } from "@/lib/period-summary";
import {
  currentTrialReportRange,
  getCachedReport,
  lastMonthRange,
  MONTHLY_REPORT_MIN_TX,
  previewTrialReportRange,
  type ReportKind,
} from "@/lib/monthly-report";

// The AI paragraph for the home report card: 小熊月報 (last month) or the
// trial report (the trial so far). The period is always derived here, never
// taken from the request, so the endpoint can only produce the one report
// the card is showing. Generated once and cached in monthly_reports;
// repeat calls are free.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await hasCoreAccess(userId))) {
    return NextResponse.json({ error: "locked" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { kind?: string; preview?: boolean };
  const kind: ReportKind = body.kind === "trial" ? "trial" : "month";
  // Admin preview of the trial card (/record?previewReport=trial): a made-up
  // window, so it's generated fresh and never cached.
  const preview = kind === "trial" && body.preview === true && isDevAdmin(userId);
  const range = preview
    ? previewTrialReportRange()
    : kind === "trial"
      ? await currentTrialReportRange(userId)
      : lastMonthRange();
  if (!range) {
    return NextResponse.json({ error: "not_available" }, { status: 422 });
  }

  const cached = preview ? null : await getCachedReport(userId, kind, range.startStr);
  if (cached) return NextResponse.json({ summary: cached });

  const facts = await getPeriodFacts(userId, range);
  if (facts.txCount < MONTHLY_REPORT_MIN_TX) {
    return NextResponse.json({ error: "not_enough_data" }, { status: 422 });
  }

  const usage = await getAiUsageStatus(userId, "monthly_summary");
  if (!usage.allowed) {
    return NextResponse.json({ error: "小熊忙不過來，晚點再來看看。" }, { status: 429 });
  }

  let text: string;
  try {
    text = await generatePeriodSummary(range.label, facts);
  } catch {
    return NextResponse.json({ error: "小熊暫時寫不出來，晚點再來看看。" }, { status: 502 });
  }

  // Two tabs racing: the unique key keeps one row, and both callers still
  // get a sensible paragraph back.
  if (!preview) {
    await db
      .insert(monthlyReports)
      .values({ userId, kind, month: range.startStr, summary: text })
      .onConflictDoNothing();
  }
  await recordAiUsage(userId, "monthly_summary");

  return NextResponse.json({ summary: text });
}
