import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { categories, sharedExpenses, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { requireCoreAccess } from "@/lib/entitlements";
import { getMonthlySharedExpenseTrend } from "@/lib/shared-trend";
import { SharedLedgerDashboard } from "@/components/shared/dashboard";

export default async function SharedLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "shared");
  const { from, to } = await searchParams;

  const dateConditions = [];
  if (from) dateConditions.push(gte(sharedExpenses.occurredAt, from));
  if (to) dateConditions.push(lte(sharedExpenses.occurredAt, to));

  const [settingsRows, expenseRows, expenseCategories, monthlyTrend] = await Promise.all([
    db.select({ partnerName: userSettings.partnerName }).from(userSettings).where(eq(userSettings.userId, userId)),
    db
      .select({
        id: sharedExpenses.id,
        name: sharedExpenses.name,
        amount: sharedExpenses.amount,
        paidByMe: sharedExpenses.paidByMe,
        occurredAt: sharedExpenses.occurredAt,
        isSettled: sharedExpenses.isSettled,
        categoryId: sharedExpenses.categoryId,
        categoryName: categories.name,
      })
      .from(sharedExpenses)
      .leftJoin(categories, eq(sharedExpenses.categoryId, categories.id))
      .where(and(eq(sharedExpenses.userId, userId), ...dateConditions))
      .orderBy(desc(sharedExpenses.occurredAt), desc(sharedExpenses.createdAt)),
    db
      .select({ id: categories.id, name: categories.name, icon: categories.icon, color: categories.color })
      .from(categories)
      .where(and(eq(categories.type, "expense"), eq(categories.userId, userId)))
      .orderBy(categories.sortOrder),
    getMonthlySharedExpenseTrend(userId),
  ]);

  const partnerName = settingsRows[0]?.partnerName || "另一半";

  return (
    <SharedLedgerDashboard
      partnerName={partnerName}
      expenses={expenseRows}
      categories={expenseCategories}
      dateFrom={from}
      dateTo={to}
      monthlyTrend={monthlyTrend}
    />
  );
}
