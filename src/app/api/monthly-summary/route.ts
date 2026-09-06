import { NextResponse } from "next/server";
import { generateText } from "ai";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { detectSpendingAnomalies } from "@/lib/analytics";
import { resolveStatsRange } from "@/lib/stats/range";
import { getPreviousPeriodTotals } from "@/lib/stats/overview-queries";

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

  const [periodTx, prevTotals, anomalies] = await Promise.all([
    db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        exchangeRate: transactions.exchangeRate,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, range.startStr),
          lte(transactions.occurredAt, range.endStr),
        ),
      ),
    getPreviousPeriodTotals(userId, range),
    detectSpendingAnomalies(userId, range.end),
  ]);

  if (periodTx.length === 0) {
    return NextResponse.json({
      summary: `${range.label}還沒有任何記帳紀錄，開始記帳後這裡會出現你的專屬摘要。`,
    });
  }

  const sum = (rows: { type: string; amount: string; exchangeRate: string }[], type: string) =>
    rows.filter((r) => r.type === type).reduce((s, r) => s + Number(r.amount) * Number(r.exchangeRate), 0);

  const thisIncome = sum(periodTx, "income");
  const thisExpense = sum(periodTx, "expense");

  const categoryTotals = new Map<string, number>();
  for (const t of periodTx) {
    if (t.type !== "expense" || !t.categoryName) continue;
    const amount = Number(t.amount) * Number(t.exchangeRate);
    categoryTotals.set(t.categoryName, (categoryTotals.get(t.categoryName) ?? 0) + amount);
  }
  const topCategories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const { text } = await generateText({
    model: "anthropic/claude-haiku-4-5",
    prompt: `你是理財顧問，根據以下數據，用繁體中文寫一段 3-5 句話的記帳摘要，語氣自然、具體指出重點與建議，不要條列，不要客套開場白。

分析區間：${range.label}
本期收入：${thisIncome}，本期支出：${thisExpense}
上一期收入：${prevTotals.income}，上一期支出：${prevTotals.expense}
本期支出前五大分類：${topCategories.map(([name, amt]) => `${name} ${amt}`).join("、") || "無"}
異常偏高的分類：${
      anomalies.length > 0
        ? anomalies
            .map(
              (a) =>
                `${a.categoryName}（本期 ${Math.round(a.thisMonth)}，較過去平均高 ${Math.round(a.pctChange * 100)}%）`,
            )
            .join("、")
        : "無"
    }`,
  });

  return NextResponse.json({ summary: text });
}
