import { format, startOfMonth, endOfMonth } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateBudgetDialog } from "@/components/budgets/create-budget-dialog";
import { BudgetsList } from "@/components/budgets/budgets-list";
import { BudgetMonthSummary } from "@/components/budgets/budget-month-summary";
import { BearIllustration } from "@/components/bear-illustration";
import { getTodayInTaipei } from "@/lib/date";

export default async function BudgetsPage() {
  const userId = await requireUserId();
  const monthStart = format(startOfMonth(getTodayInTaipei()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(getTodayInTaipei()), "yyyy-MM-dd");

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
      .where(and(eq(categories.type, "expense"), eq(categories.userId, userId)))
      .orderBy(categories.sortOrder),
    db
      .select({
        categoryId: transactions.categoryId,
        amount: transactions.amount,
        exchangeRate: transactions.exchangeRate,
      })
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
    const amount = Number(t.amount) * Number(t.exchangeRate);
    totalSpent += amount;
    if (!t.categoryId) continue;
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + amount);
  }

  const budgetsWithSpent = monthBudgets.map((b) => ({
    ...b,
    spent: b.categoryId ? (spentByCategory.get(b.categoryId) ?? 0) : totalSpent,
  }));

  // Month pacing: an overall budget row (categoryId === null) is the honest
  // denominator for "how much of my month's money is gone"; if there isn't
  // one, fall back to summing the per-category limits so the summary still
  // means something.
  const today = getTodayInTaipei();
  const overallBudget = budgetsWithSpent.find((b) => b.categoryId === null);
  const totalLimit = overallBudget
    ? Number(overallBudget.limitAmount)
    : budgetsWithSpent.reduce((sum, b) => sum + Number(b.limitAmount), 0);
  const daysInMonth = Number(format(endOfMonth(today), "d"));
  const dayOfMonth = Number(format(today, "d"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">預算</h1>
        <CreateBudgetDialog categories={expenseCategories} />
      </div>

      {budgetsWithSpent.length > 0 && totalLimit > 0 && (
        <BudgetMonthSummary
          spent={totalSpent}
          limit={totalLimit}
          dayOfMonth={dayOfMonth}
          daysInMonth={daysInMonth}
          isOverallBudget={overallBudget != null}
        />
      )}

      {budgetsWithSpent.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center shadow-md shadow-foreground/10">
          <BearIllustration name="empty" size={96} />
          <p className="text-muted-foreground text-sm">本月還沒有設定預算。</p>
        </div>
      ) : (
        <BudgetsList budgets={budgetsWithSpent} />
      )}
    </div>
  );
}
