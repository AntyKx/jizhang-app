import { format, startOfMonth, endOfMonth } from "date-fns";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateBudgetDialog } from "@/components/budgets/create-budget-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function BudgetsPage() {
  const userId = await requireUserId();
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [monthBudgets, expenseCategories, monthExpenses] = await Promise.all([
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
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(
        and(
          eq(categories.type, "expense"),
          or(isNull(categories.userId), eq(categories.userId, userId)),
        ),
      ),
    db
      .select({ categoryId: transactions.categoryId, amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.occurredAt, monthStart),
          lte(transactions.occurredAt, monthEnd),
        ),
      ),
  ]);

  const spentByCategory = new Map<string, number>();
  let totalSpent = 0;
  for (const t of monthExpenses) {
    totalSpent += Number(t.amount);
    if (!t.categoryId) continue;
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + Number(t.amount));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">預算</h1>
        <CreateBudgetDialog categories={expenseCategories} />
      </div>

      {monthBudgets.length === 0 ? (
        <p className="text-muted-foreground text-sm">本月還沒有設定預算。</p>
      ) : (
        <div className="flex flex-col gap-4">
          {monthBudgets.map((b) => {
            const spent = b.categoryId ? spentByCategory.get(b.categoryId) ?? 0 : totalSpent;
            const pct = Math.min(100, (spent / Number(b.limitAmount)) * 100);
            return (
              <Card key={b.id}>
                <CardHeader>
                  <CardTitle className="text-base">{b.categoryName ?? "整體預算"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className={pct >= 100 ? "text-destructive" : ""}>
                      {spent.toLocaleString("zh-TW")}
                    </span>
                    <span className="text-muted-foreground">
                      / {Number(b.limitAmount).toLocaleString("zh-TW")}
                    </span>
                  </div>
                  <Progress value={pct} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
