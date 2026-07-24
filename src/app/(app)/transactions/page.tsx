import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { paymentMethodIcon, paymentMethodLabel } from "@/lib/payment-methods";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";

export default async function TransactionsPage() {
  const userId = await requireUserId();

  const allTransactions = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      note: transactions.note,
      merchant: transactions.merchant,
      occurredAt: transactions.occurredAt,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      paymentMethod: transactions.paymentMethod,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
    .limit(200);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">所有交易</h1>

      {allTransactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">還沒有任何交易紀錄。</p>
      ) : (
        <div className="flex flex-col divide-y rounded-2xl border bg-card">
          {allTransactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={t.categoryIcon} className="h-6 w-6 text-xl" />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.merchant || t.note || "（無備註）"}</span>
                    {t.categoryName && <Badge variant="outline">{t.categoryName}</Badge>}
                    <span className="text-xs" title={paymentMethodLabel(t.paymentMethod)}>
                      {paymentMethodIcon(t.paymentMethod)}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">{t.occurredAt}</span>
                </div>
              </div>
              <span
                className={
                  t.type === "expense"
                    ? "font-semibold text-destructive"
                    : "font-semibold text-emerald-600"
                }
              >
                {t.type === "expense" ? "-" : "+"}
                {Number(t.amount).toLocaleString("zh-TW")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
