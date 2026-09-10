import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { categories, sharedExpenses } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { requireCoreAccess } from "@/lib/entitlements";
import { getMonthlySharedExpenseTrend } from "@/lib/shared-trend";
import { flattenSharedExpenseRows } from "@/lib/shared-expenses";
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

  const [rows, expenseCategories, monthlyTrend] = await Promise.all([
    db
      .select({
        id: sharedExpenses.id,
        name: sharedExpenses.name,
        categoryId: sharedExpenses.categoryId,
        categoryName: categories.name,
        occurredAt: sharedExpenses.occurredAt,
        linkedTransactionId: sharedExpenses.linkedTransactionId,
        participants: sharedExpenses.participants,
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

  const items = flattenSharedExpenseRows(rows);

  return (
    <SharedLedgerDashboard
      items={items}
      categories={expenseCategories}
      dateFrom={from}
      dateTo={to}
      monthlyTrend={monthlyTrend}
    />
  );
}
