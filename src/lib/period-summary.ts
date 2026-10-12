import { generateText } from "ai";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { detectSpendingAnomalies } from "@/lib/analytics";
import type { StatsRange } from "@/lib/stats/range";
import { getPreviousPeriodTotals } from "@/lib/stats/overview-queries";

export type PeriodFacts = {
  txCount: number;
  income: number;
  expense: number;
  prevIncome: number;
  prevExpense: number;
  topCategories: [string, number][];
  anomalies: Awaited<ReturnType<typeof detectSpendingAnomalies>>;
};

// The numbers both AI summaries (/stats on demand, 小熊月報 on the home
// page) are written from. Cheap — no model call — so the home card also
// uses it for the free-tier numbers it shows without AI.
export async function getPeriodFacts(userId: string, range: StatsRange): Promise<PeriodFacts> {
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

  let income = 0;
  let expense = 0;
  const categoryTotals = new Map<string, number>();
  for (const t of periodTx) {
    const amount = Number(t.amount) * Number(t.exchangeRate);
    if (t.type === "income") income += amount;
    if (t.type !== "expense") continue;
    expense += amount;
    if (t.categoryName) categoryTotals.set(t.categoryName, (categoryTotals.get(t.categoryName) ?? 0) + amount);
  }

  return {
    txCount: periodTx.length,
    income,
    expense,
    prevIncome: prevTotals.income,
    prevExpense: prevTotals.expense,
    topCategories: [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    anomalies,
  };
}

// Throws when the model call fails; callers turn that into their own error
// response. Callers are also responsible for the quota check and for
// recordAiUsage — this only writes the text.
export async function generatePeriodSummary(rangeLabel: string, facts: PeriodFacts): Promise<string> {
  const { text } = await generateText({
    model: "anthropic/claude-haiku-4-5",
    prompt: `你是理財顧問，根據以下數據，用繁體中文寫一段 3-5 句話的記帳摘要，語氣自然、具體指出重點與建議，不要條列，不要客套開場白。

分析區間：${rangeLabel}
本期收入：${facts.income}，本期支出：${facts.expense}
上一期收入：${facts.prevIncome}，上一期支出：${facts.prevExpense}
本期支出前五大分類：${facts.topCategories.map(([name, amt]) => `${name} ${amt}`).join("、") || "無"}
異常偏高的分類：${
      facts.anomalies.length > 0
        ? facts.anomalies
            .map(
              (a) =>
                `${a.categoryName}（本期 ${Math.round(a.thisMonth)}，較過去平均高 ${Math.round(a.pctChange * 100)}%）`,
            )
            .join("、")
        : "無"
    }`,
  });
  return text;
}
