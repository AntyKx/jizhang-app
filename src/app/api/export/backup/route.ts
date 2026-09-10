import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgets,
  categories,
  recurringRules,
  savingsGoals,
  sharedExpenses,
  transactions,
  userSettings,
} from "@/db/schema";

// Deliberately not gated by requireCoreAccessApi — downloading a copy of
// your own data is a data-subject right, not a paid feature (see
// deleteAllUserData()'s comment, and /terms' recommendation that users back
// up via this page, which would be a broken promise for free users if this
// were paywalled). Only restoreBackup() (the destructive, replace-style
// operation) stays behind the core-unlock gate.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [
    userCategories,
    userAccounts,
    userRecurringRules,
    userTransactions,
    userBudgets,
    userSavingsGoals,
    userSharedExpenses,
    settingsRows,
  ] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        type: categories.type,
        icon: categories.icon,
        color: categories.color,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.userId, userId)),
    db
      .select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        currency: accounts.currency,
        initialBalance: accounts.initialBalance,
        initialExchangeRate: accounts.initialExchangeRate,
        currentBalance: accounts.currentBalance,
        color: accounts.color,
        icon: accounts.icon,
        isArchived: accounts.isArchived,
        excludeFromNetWorth: accounts.excludeFromNetWorth,
        statementDay: accounts.statementDay,
        sortOrder: accounts.sortOrder,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
    db
      .select({
        id: recurringRules.id,
        accountId: recurringRules.accountId,
        categoryId: recurringRules.categoryId,
        name: recurringRules.name,
        amount: recurringRules.amount,
        type: recurringRules.type,
        paymentMethod: recurringRules.paymentMethod,
        frequency: recurringRules.frequency,
        interval: recurringRules.interval,
        nextOccurrence: recurringRules.nextOccurrence,
        endDate: recurringRules.endDate,
        isSubscription: recurringRules.isSubscription,
        isActive: recurringRules.isActive,
      })
      .from(recurringRules)
      .where(eq(recurringRules.userId, userId)),
    db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        toAccountId: transactions.toAccountId,
        categoryId: transactions.categoryId,
        type: transactions.type,
        amount: transactions.amount,
        exchangeRate: transactions.exchangeRate,
        feeAmount: transactions.feeAmount,
        paymentMethod: transactions.paymentMethod,
        note: transactions.note,
        merchant: transactions.merchant,
        occurredAt: transactions.occurredAt,
        recurringRuleId: transactions.recurringRuleId,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
    db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        month: budgets.month,
        limitAmount: budgets.limitAmount,
      })
      .from(budgets)
      .where(eq(budgets.userId, userId)),
    db
      .select({
        id: savingsGoals.id,
        name: savingsGoals.name,
        targetAmount: savingsGoals.targetAmount,
        currentAmount: savingsGoals.currentAmount,
        targetDate: savingsGoals.targetDate,
        icon: savingsGoals.icon,
        color: savingsGoals.color,
        isCompleted: savingsGoals.isCompleted,
      })
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId)),
    db
      .select({
        id: sharedExpenses.id,
        categoryId: sharedExpenses.categoryId,
        name: sharedExpenses.name,
        note: sharedExpenses.note,
        occurredAt: sharedExpenses.occurredAt,
        linkedTransactionId: sharedExpenses.linkedTransactionId,
        participants: sharedExpenses.participants,
      })
      .from(sharedExpenses)
      .where(eq(sharedExpenses.userId, userId)),
    db
      .select({
        baseCurrency: userSettings.baseCurrency,
        monthStartDay: userSettings.monthStartDay,
        defaultAccountId: userSettings.defaultAccountId,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId)),
  ]);

  const backup = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    categories: userCategories,
    accounts: userAccounts,
    recurringRules: userRecurringRules,
    transactions: userTransactions,
    budgets: userBudgets,
    savingsGoals: userSavingsGoals,
    sharedExpenses: userSharedExpenses,
    settings: settingsRows[0] ?? null,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="jizhang-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
