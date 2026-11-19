import { format, startOfMonth, endOfMonth } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { budgets, transactions } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";
import { activeBudget, ensureMonthBudgets } from "@/lib/budgets";
import { HomeSummary } from "@/components/record/home-summary";

// Independent Suspense island on /record — its own currentUser() (an
// external Clerk API call, the one dependency in the old single-fetch
// homepage most likely to be the slow one) no longer blocks the rest of
// the page from appearing. Only sums today/this-month expense here rather
// than reusing the full transaction row list TodayTransactionsSection
// fetches — cheaper query, and keeps the two sections from needing to
// coordinate/dedupe a shared fetch.
export async function HomeSummarySection({ userId }: { userId: string }) {
  const todayDate = getTodayInTaipei();
  const today = format(todayDate, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(todayDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(todayDate), "yyyy-MM-dd");

  await ensureMonthBudgets(userId, monthStart);

  const [user, todayExpenseRows, monthExpenseRows, monthBudgets] = await Promise.all([
    currentUser(),
    db
      .select({ amount: transactions.amount, exchangeRate: transactions.exchangeRate })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          eq(transactions.occurredAt, today),
        ),
      ),
    db
      .select({
        amount: transactions.amount,
        exchangeRate: transactions.exchangeRate,
        categoryId: transactions.categoryId,
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
    // Every budget row for the month, not just the overall one — /budgets
    // falls back to summing the per-category limits when no overall budget
    // exists, and the home banner showing nothing at all in that case made
    // the two screens disagree about whether a budget was even set.
    db
      .select({ categoryId: budgets.categoryId, limitAmount: budgets.limitAmount })
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, monthStart), activeBudget)),
  ]);

  const userName = user?.firstName ?? user?.username ?? null;
  const todayExpense = todayExpenseRows.reduce((sum, r) => sum + Number(r.amount) * Number(r.exchangeRate), 0);
  const monthExpense = monthExpenseRows.reduce((sum, r) => sum + Number(r.amount) * Number(r.exchangeRate), 0);
  // Same rule as /budgets' BudgetMonthSummary: prefer the explicit overall
  // budget, else treat the per-category limits' sum as the month's total.
  const overallRow = monthBudgets.find((b) => b.categoryId === null);
  const budgetTotal = overallRow
    ? Number(overallRow.limitAmount)
    : monthBudgets.reduce((sum, b) => sum + Number(b.limitAmount), 0);
  const budgetLimit = budgetTotal > 0 ? budgetTotal : null;
  // Same rule as /budgets: with no overall budget only the budgeted
  // categories' spending is measured against their summed limits.
  const budgetedCategories = new Set(monthBudgets.map((b) => b.categoryId));
  const budgetSpent = overallRow
    ? monthExpense
    : monthExpenseRows
        .filter((r) => r.categoryId && budgetedCategories.has(r.categoryId))
        .reduce((sum, r) => sum + Number(r.amount) * Number(r.exchangeRate), 0);

  return (
    <HomeSummary
      userName={userName}
      todayExpense={todayExpense}
      monthExpense={monthExpense}
      budgetLimit={budgetLimit}
      budgetSpent={budgetSpent}
    />
  );
}
