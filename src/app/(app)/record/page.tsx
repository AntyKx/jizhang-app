import { format } from "date-fns";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { RecordScreen } from "@/components/record/record-screen";

export default async function RecordPage() {
  const userId = await requireUserId();
  const today = format(new Date(), "yyyy-MM-dd");

  const [userCategories, todayTransactions] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
        type: categories.type,
      })
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId)))
      .orderBy(categories.sortOrder),
    db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        merchant: transactions.merchant,
        note: transactions.note,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        paymentMethod: transactions.paymentMethod,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), eq(transactions.occurredAt, today)))
      .orderBy(desc(transactions.createdAt)),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-center text-xl font-semibold">記一筆帳 📝</h1>
      <RecordScreen categories={userCategories} todayTransactions={todayTransactions} />
    </div>
  );
}
