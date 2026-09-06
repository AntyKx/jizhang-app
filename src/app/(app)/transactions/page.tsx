import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, sharedExpenses, transactions, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { listAccounts, listArchivedAccounts } from "@/lib/account";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { TransactionsFilterHeader } from "@/components/transactions/transactions-filter-header";
import { TRANSACTIONS_PAGE_SIZE, type ListItemRow, type TransactionsFilter } from "@/lib/transactions/list-types";
import { transactionsFilterConditions } from "@/lib/transactions/filter";

export default async function TransactionsPage({
  searchParams,
}: {
  // Reached filtered from a category on /stats — categoryId "uncategorized"
  // is a real, selectable state (see TransactionsFilter), distinct from no
  // filter at all (the param simply absent).
  searchParams: Promise<{ categoryId?: string; start?: string; end?: string; label?: string }>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;

  const filter: TransactionsFilter | undefined = sp.categoryId
    ? { categoryId: sp.categoryId === "uncategorized" ? null : sp.categoryId, start: sp.start, end: sp.end }
    : undefined;
  const filterConditions = transactionsFilterConditions(filter);

  const [regularRows, transferRows, userCategories, userAccounts, archivedAccounts, settingsRows] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        note: transactions.note,
        merchant: transactions.merchant,
        occurredAt: transactions.occurredAt,
        createdAt: transactions.createdAt,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        paymentMethod: transactions.paymentMethod,
        accountId: transactions.accountId,
        sharedExpenseId: sharedExpenses.id,
        sharedExpensePaidByMe: sharedExpenses.paidByMe,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(sharedExpenses, eq(sharedExpenses.linkedTransactionId, transactions.id))
      .where(
        and(
          eq(transactions.userId, userId),
          ne(transactions.type, "transfer"),
          ...filterConditions,
        ),
      )
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(TRANSACTIONS_PAGE_SIZE),
    // A category filter never matches a transfer (transfers have no
    // category), so skip that stream entirely rather than querying for rows
    // that can't come back.
    filter?.categoryId !== undefined
      ? Promise.resolve([])
      : db
          .select({
            id: transactions.id,
            amount: transactions.amount,
            feeAmount: transactions.feeAmount,
            note: transactions.note,
            occurredAt: transactions.occurredAt,
            createdAt: transactions.createdAt,
            fromAccountId: transactions.accountId,
            toAccountId: transactions.toAccountId,
          })
          .from(transactions)
          .where(and(eq(transactions.userId, userId), eq(transactions.type, "transfer"), ...filterConditions))
          .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
          .limit(TRANSACTIONS_PAGE_SIZE),
    db
      .select({
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        type: categories.type,
      })
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId)))
      .orderBy(categories.sortOrder),
    listAccounts(userId),
    listArchivedAccounts(userId),
    db
      .select({ partnerName: userSettings.partnerName })
      .from(userSettings)
      .where(eq(userSettings.userId, userId)),
  ]);

  const accountsById = Object.fromEntries(
    [...userAccounts, ...archivedAccounts].map((a) => [a.id, { name: a.name, type: a.type }]),
  );
  const partnerName = settingsRows[0]?.partnerName || "另一半";

  // The query already excludes/includes "transfer" rows by type; narrow here
  // since drizzle can't reflect a runtime `where` filter in its inferred
  // column type. Merge the two shapes by occurredAt/createdAt so the list
  // reads as one continuous timeline instead of two separate feeds.
  const merged: ListItemRow[] = [
    ...regularRows.map((t) => ({
      ...t,
      kind: "transaction" as const,
      type: t.type as "income" | "expense",
      isSharedExpense: t.sharedExpenseId !== null,
      paidByMe: t.sharedExpensePaidByMe ?? true,
    })),
    ...transferRows.map((t) => ({ ...t, kind: "transfer" as const })),
  ].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  // Either stream hitting the page size means there could be more of that
  // type beyond this fetch, even if the merged page below is shorter.
  const mightHaveMore =
    merged.length > TRANSACTIONS_PAGE_SIZE ||
    regularRows.length === TRANSACTIONS_PAGE_SIZE ||
    transferRows.length === TRANSACTIONS_PAGE_SIZE;

  const items = merged.slice(0, TRANSACTIONS_PAGE_SIZE);
  const last = items[items.length - 1];
  const initialCursor =
    mightHaveMore && last ? { occurredAt: last.occurredAt, createdAt: last.createdAt } : null;

  const filterCategory =
    filter && filter.categoryId
      ? (userCategories.find((c) => c.id === filter.categoryId) ?? null)
      : null;

  return (
    <div className="flex flex-col gap-6">
      {filter ? (
        <TransactionsFilterHeader
          icon={filterCategory?.icon ?? null}
          color={filterCategory?.color}
          name={filter.categoryId === null ? "未分類" : (filterCategory?.name ?? "分類")}
          label={sp.label}
        />
      ) : (
        <h1 className="text-2xl font-semibold">所有交易</h1>
      )}
      <TransactionsList
        items={items}
        categories={userCategories}
        accounts={userAccounts
          .filter((a) => !a.excludeFromNetWorth)
          .map((a) => ({ id: a.id, name: a.name, type: a.type }))}
        accountsById={accountsById}
        initialCursor={initialCursor}
        partnerName={partnerName}
        filter={filter}
      />
    </div>
  );
}
