import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { monthlyReports } from "@/db/schema";
import { getAiUsageStatus, hasCoreAccess, recordAiUsage } from "@/lib/entitlements";
import { generatePeriodSummary, getPeriodFacts } from "@/lib/period-summary";
import { lastMonthRange, MONTHLY_REPORT_MIN_TX } from "@/lib/monthly-report";

// 小熊月報's AI paragraph for last month. The month is always derived here,
// never taken from the request, so the endpoint can only ever produce the
// one report the home card is showing. Generated once per user per month
// and cached in monthly_reports; repeat calls are free.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await hasCoreAccess(userId))) {
    return NextResponse.json({ error: "locked" }, { status: 403 });
  }

  const range = lastMonthRange();
  const [cached] = await db
    .select({ summary: monthlyReports.summary })
    .from(monthlyReports)
    .where(and(eq(monthlyReports.userId, userId), eq(monthlyReports.month, range.startStr)));
  if (cached) return NextResponse.json({ summary: cached.summary });

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
  await db
    .insert(monthlyReports)
    .values({ userId, month: range.startStr, summary: text })
    .onConflictDoNothing();
  await recordAiUsage(userId, "monthly_summary");

  return NextResponse.json({ summary: text });
}
