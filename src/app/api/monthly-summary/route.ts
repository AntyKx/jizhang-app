import { NextResponse } from "next/server";
import { generateText } from "ai";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { detectSpendingAnomalies } from "@/lib/analytics";
import { getTodayInTaipei } from "@/lib/date";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = getTodayInTaipei();
  const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const thisMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = format(startOfMonth(lastMonth), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(lastMonth), "yyyy-MM-dd");

  const [thisMonthTx, lastMonthTx, anomalies] = await Promise.all([
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
          gte(transactions.occurredAt, thisMonthStart),
          lte(transactions.occurredAt, thisMonthEnd),
        ),
      ),
    db
      .select({ type: transactions.type, amount: transactions.amount, exchangeRate: transactions.exchangeRate })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, lastMonthStart),
          lte(transactions.occurredAt, lastMonthEnd),
        ),
      ),
    detectSpendingAnomalies(userId, now),
  ]);

  if (thisMonthTx.length === 0) {
    return NextResponse.json({
      summary: "這個月還沒有任何記帳紀錄，開始記帳後這裡會出現你的專屬摘要。",
    });
  }

  const sum = (rows: { type: string; amount: string; exchangeRate: string }[], type: string) =>
    rows.filter((r) => r.type === type).reduce((s, r) => s + Number(r.amount) * Number(r.exchangeRate), 0);

  const thisIncome = sum(thisMonthTx, "income");
  const thisExpense = sum(thisMonthTx, "expense");
  const lastIncome = sum(lastMonthTx, "income");
  const lastExpense = sum(lastMonthTx, "expense");

  const categoryTotals = new Map<string, number>();
  for (const t of thisMonthTx) {
    if (t.type !== "expense" || !t.categoryName) continue;
    const amount = Number(t.amount) * Number(t.exchangeRate);
    categoryTotals.set(t.categoryName, (categoryTotals.get(t.categoryName) ?? 0) + amount);
  }
  const topCategories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const { text } = await generateText({
    model: "anthropic/claude-haiku-4-5",
    prompt: `你是理財顧問，根據以下數據，用繁體中文寫一段 3-5 句話的本月記帳摘要，語氣自然、具體指出重點與建議，不要條列，不要客套開場白。

本月收入：${thisIncome}，本月支出：${thisExpense}
上月收入：${lastIncome}，上月支出：${lastExpense}
本月支出前五大分類：${topCategories.map(([name, amt]) => `${name} ${amt}`).join("、") || "無"}
異常偏高的分類：${
      anomalies.length > 0
        ? anomalies
            .map(
              (a) =>
                `${a.categoryName}（本月 ${Math.round(a.thisMonth)}，較過去平均高 ${Math.round(a.pctChange * 100)}%）`,
            )
            .join("、")
        : "無"
    }`,
  });

  return NextResponse.json({ summary: text });
}
