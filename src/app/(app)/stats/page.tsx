import { format, startOfMonth, endOfMonth } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, savingsGoals, transactions, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { detectSpendingAnomalies } from "@/lib/analytics";
import { paymentMethodColor, paymentMethodIcon, paymentMethodLabel } from "@/lib/payment-methods";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MonthlySummaryCard } from "@/components/stats/monthly-summary-card";
import { CategoryBreakdown } from "@/components/stats/category-breakdown";

export default async function StatsPage() {
  const userId = await requireUserId();

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [monthTransactions, settings, goals, monthBudgets, anomalies] = await Promise.all([
    db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        paymentMethod: transactions.paymentMethod,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, monthStart),
          lte(transactions.occurredAt, monthEnd),
        ),
      ),
    db.select().from(userSettings).where(eq(userSettings.userId, userId)),
    db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.isCompleted, false)))
      .limit(3),
    db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        limitAmount: budgets.limitAmount,
        categoryName: categories.name,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, userId), eq(budgets.month, monthStart))),
    detectSpendingAnomalies(userId),
  ]);

  const income = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const spentByCategory = new Map<string, number>();
  const categoryMeta = new Map<string, { icon: string | null; color: string }>();
  for (const t of monthTransactions) {
    if (t.type !== "expense" || !t.categoryId || !t.categoryName) continue;
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + Number(t.amount));
    categoryMeta.set(t.categoryId, {
      icon: t.categoryIcon,
      color: t.categoryColor ?? "#6366f1",
    });
  }
  const breakdownRows = [...spentByCategory.entries()]
    .map(([categoryId, amount]) => {
      const tx = monthTransactions.find((t) => t.categoryId === categoryId);
      return {
        name: tx?.categoryName ?? "未分類",
        icon: categoryMeta.get(categoryId)?.icon ?? null,
        color: categoryMeta.get(categoryId)?.color ?? "#6366f1",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const spentByPaymentMethod = new Map<string, number>();
  for (const t of monthTransactions) {
    if (t.type !== "expense") continue;
    spentByPaymentMethod.set(
      t.paymentMethod,
      (spentByPaymentMethod.get(t.paymentMethod) ?? 0) + Number(t.amount),
    );
  }
  const paymentBreakdownRows = [...spentByPaymentMethod.entries()]
    .map(([method, amount]) => ({
      name: paymentMethodLabel(method),
      icon: paymentMethodIcon(method),
      color: paymentMethodColor(method),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const streak = settings[0]?.currentStreak ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">統計</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">本月收入</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">
            {income.toLocaleString("zh-TW")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">本月支出</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">
            {expense.toLocaleString("zh-TW")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">連續記帳天數</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">🔥 {streak} 天</CardContent>
        </Card>
      </div>

      <MonthlySummaryCard />

      <Card>
        <CardHeader>
          <CardTitle>本月支出分類</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBreakdown rows={breakdownRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>本月付款方式</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBreakdown rows={paymentBreakdownRows} />
        </CardContent>
      </Card>

      {anomalies.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-600">消費異常提醒</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {anomalies.map((a) => (
              <div key={a.categoryName} className="flex justify-between text-sm">
                <span>{a.categoryName}</span>
                <span className="text-amber-600">
                  本月 {Math.round(a.thisMonth).toLocaleString("zh-TW")}，較平均高{" "}
                  {Math.round(a.pctChange * 100)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {monthBudgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>本月預算</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {monthBudgets.map((b) => {
              const spent = b.categoryId ? spentByCategory.get(b.categoryId) ?? 0 : expense;
              const pct = Math.min(100, (spent / Number(b.limitAmount)) * 100);
              return (
                <div key={b.id} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{b.categoryName ?? "整體預算"}</span>
                    <span className={pct >= 100 ? "text-destructive" : "text-muted-foreground"}>
                      {spent.toLocaleString("zh-TW")} / {Number(b.limitAmount).toLocaleString("zh-TW")}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>儲蓄目標</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {goals.map((g) => {
              const pct = Math.min(100, (Number(g.currentAmount) / Number(g.targetAmount)) * 100);
              return (
                <div key={g.id} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">
                      {Number(g.currentAmount).toLocaleString("zh-TW")} /{" "}
                      {Number(g.targetAmount).toLocaleString("zh-TW")}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
