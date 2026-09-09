import { format } from "date-fns";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, sharedExpenses, transactions } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";
import { TodayTransactionRow, type TodayTransaction } from "@/components/record/today-transaction-row";
import { BearIllustration } from "@/components/bear-illustration";
import { Reveal } from "@/components/motion/reveal";
import { StaggerList } from "@/components/motion/stagger-list";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

// Independent Suspense island on /record — deliberately fetches its own
// full transaction row list rather than reusing anything from
// HomeSummarySection (which only sums today's expense, doesn't need full
// rows), so the two never have to coordinate or dedupe a shared query.
export async function TodayTransactionsSection({
  userId,
  categories: categoryList,
  accounts: accountList,
  partnerName,
}: {
  userId: string;
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  partnerName: string;
}) {
  const today = format(getTodayInTaipei(), "yyyy-MM-dd");

  const rows = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      exchangeRate: transactions.exchangeRate,
      type: transactions.type,
      merchant: transactions.merchant,
      note: transactions.note,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      paymentMethod: transactions.paymentMethod,
      accountId: transactions.accountId,
      accountName: accounts.name,
      occurredAt: transactions.occurredAt,
      createdAt: transactions.createdAt,
      sharedExpenseId: sharedExpenses.id,
      sharedExpensePaidByMe: sharedExpenses.paidByMe,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(sharedExpenses, eq(sharedExpenses.linkedTransactionId, transactions.id))
    .where(
      and(eq(transactions.userId, userId), eq(transactions.occurredAt, today), ne(transactions.type, "transfer")),
    )
    .orderBy(desc(transactions.createdAt));

  // The query already excludes "transfer" rows — narrow the type here for
  // the same reason as dueRules above.
  const todayTransactions: TodayTransaction[] = rows.map((t) => ({
    ...t,
    type: t.type as "income" | "expense",
    isSharedExpense: t.sharedExpenseId !== null,
    paidByMe: t.sharedExpensePaidByMe ?? true,
  }));

  if (todayTransactions.length === 0) {
    return (
      <Reveal className="flex flex-col items-center gap-3 py-8 text-center">
        <BearIllustration name="record" size={64} />
        <span className="text-sm text-muted-foreground">今天還沒有記帳，來記第一筆吧！</span>
      </Reveal>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">今天記了 {todayTransactions.length} 筆</span>
      <StaggerList className="flex flex-col divide-y">
        {todayTransactions.map((t) => (
          <TodayTransactionRow
            key={t.id}
            transaction={t}
            categories={categoryList}
            accounts={accountList}
            showAccount={accountList.length > 1}
            partnerName={partnerName}
          />
        ))}
      </StaggerList>
    </div>
  );
}
