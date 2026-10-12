import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAiUsageStatus, recordAiUsage } from "@/lib/entitlements";
import { resolveStatsRange } from "@/lib/stats/range";
import { generatePeriodSummary, getPeriodFacts } from "@/lib/period-summary";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Body carries whatever range the user currently has selected on /stats
  // (StatsRangeSwitcher's week/month/year + prev/next) — falls back to the
  // current month only if the request is missing it (defensive, shouldn't
  // happen from MonthlySummaryCard, which always sends the active range).
  const body = await request.json().catch(() => ({}) as { range?: string; date?: string });
  const range = resolveStatsRange({ range: body.range, date: body.date });

  const facts = await getPeriodFacts(userId, range);
  if (facts.txCount === 0) {
    return NextResponse.json({
      summary: `${range.label}還沒有任何記帳紀錄，開始記帳後這裡會出現你的專屬摘要。`,
    });
  }

  // Same abuse guard every other AI endpoint has — this one used to be
  // unmetered. Checked after the empty-period early return above, which
  // never calls the model and so shouldn't cost the user any quota.
  const usage = await getAiUsageStatus(userId, "monthly_summary");
  if (!usage.allowed) {
    const summary =
      usage.reason === "rate_limited" ? "AI 摘要產生太頻繁，請稍後再試。" : "本月 AI 摘要次數已用完。";
    return NextResponse.json({ summary }, { status: 429 });
  }

  let text: string;
  try {
    text = await generatePeriodSummary(range.label, facts);
  } catch {
    return NextResponse.json({ summary: "目前無法產生摘要，請稍後再試。" }, { status: 502 });
  }
  await recordAiUsage(userId, "monthly_summary");

  return NextResponse.json({ summary: text });
}
