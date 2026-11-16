import { and, eq, inArray, notInArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { categories, sharedExpenses, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { listAccounts, listArchivedAccounts } from "@/lib/account";
import { deriveSplitFields, getFrequentSplitNames } from "@/lib/shared-expenses";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { TransactionsFilterHeader } from "@/components/transactions/transactions-filter-header";
import {
  TRANSACTIONS_PAGE_SIZE,
  compareListRows,
  transferKind,
  type ListItemRow,
  type TransactionsFilter,
  type TransactionsTypeFilter,
} from "@/lib/transactions/list-types";
import { listStreamsFor, transactionsFilterConditions, transactionsListOrder } from "@/lib/transactions/filter";
import { TransactionsFilterBar } from "@/components/transactions/transactions-filter-bar";
import { PageHeader } from "@/components/page-header";

export default async function TransactionsPage({
  searchParams,
}: {
  // Reached filtered from a category on /stats — categoryId "uncategorized"
  // is a real, selectable state (see TransactionsFilter), distinct from no
  // filter at all (the param simply absent).
  searchParams: Promise<{
    categoryId?: string;
    start?: string;
    end?: string;
    label?: string;
    type?: string;
    account?: string;
  }>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;

  const typeFilter: TransactionsTypeFilter | undefined =
    sp.type === "expense" || sp.type === "income" || sp.type === "transfer" ? sp.type : undefined;
  const hasFilter = Boolean(sp.categoryId || typeFilter || sp.account || sp.start || sp.end);
  const filter: TransactionsFilter | undefined = hasFilter
    ? {
        ...(sp.categoryId ? { categoryId: sp.categoryId === "uncategorized" ? null : sp.categoryId } : {}),
        start: sp.start,
        end: sp.end,
        type: typeFilter,
        accountId: sp.account,
      }
    : undefined;
  const filterConditions = transactionsFilterConditions(filter);
  const streams = listStreamsFor(filter);

  // Aliased second join against the same table — the first join (below)
  // pulls a transaction's OWN split-participant data (the 分帳 toggle on the
  // transaction itself); this one pulls the split EVENT a settlement
  // transaction was created to reimburse, the opposite direction, so
  // multiple settlements of one event can be collapsed into one display
  // group (see group-settlements.ts).
  const originExpense = alias(sharedExpenses, "originExpense");

  const [regularRows, transferRows, userCategories, userAccounts, archivedAccounts, frequentSplitNames] = await Promise.all([
    !streams.regular
      ? Promise.resolve([])
      : db
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
        sharedExpenseParticipants: sharedExpenses.participants,
        linkedSharedExpenseId: transactions.linkedSharedExpenseId,
        settlementGroupLabel: originExpense.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(sharedExpenses, eq(sharedExpenses.linkedTransactionId, transactions.id))
      .leftJoin(originExpense, eq(originExpense.id, transactions.linkedSharedExpenseId))
      .where(
        and(
          eq(transactions.userId, userId),
          notInArray(transactions.type, ["transfer", "adjustment"]),
          ...filterConditions,
        ),
      )
      .orderBy(...transactionsListOrder)
      .limit(TRANSACTIONS_PAGE_SIZE),
    !streams.transfers
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
            type: transactions.type,
          })
          .from(transactions)
          .where(and(eq(transactions.userId, userId), inArray(transactions.type, ["transfer", "adjustment"]), ...filterConditions))
          .orderBy(...transactionsListOrder)
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
      .where(eq(categories.userId, userId))
      .orderBy(categories.sortOrder),
    listAccounts(userId),
    listArchivedAccounts(userId),
    getFrequentSplitNames(userId),
  ]);

  const accountsById = Object.fromEntries(
    [...userAccounts, ...archivedAccounts].map((a) => [a.id, { name: a.name, type: a.type }]),
  );

  // The query already excludes/includes "transfer" rows by type; narrow here
  // since drizzle can't reflect a runtime `where` filter in its inferred
  // column type. Merge the two shapes by occurredAt/createdAt so the list
  // reads as one continuous timeline instead of two separate feeds.
  const merged: ListItemRow[] = [
    ...regularRows.map((t) => {
      const { sharedExpenseParticipants, ...rest } = t;
      return {
        ...rest,
        kind: "transaction" as const,
        type: t.type as "income" | "expense",
        ...deriveSplitFields(sharedExpenseParticipants),
      };
    }),
    ...transferRows.map((t) => ({ ...t, ...transferKind(t.type), linkedSharedExpenseId: null, settlementGroupLabel: null })),
  ].sort(compareListRows);

  // Either stream hitting the page size means there could be more of that
  // type beyond this fetch, even if the merged page below is shorter.
  const mightHaveMore =
    merged.length > TRANSACTIONS_PAGE_SIZE ||
    regularRows.length === TRANSACTIONS_PAGE_SIZE ||
    transferRows.length === TRANSACTIONS_PAGE_SIZE;

  const items = merged.slice(0, TRANSACTIONS_PAGE_SIZE);
  const last = items[items.length - 1];
  const initialCursor =
    mightHaveMore && last ? { occurredAt: last.occurredAt, createdAt: last.createdAt, id: last.id } : null;

  const filterCategory =
    filter && filter.categoryId
      ? (userCategories.find((c) => c.id === filter.categoryId) ?? null)
      : null;
  // Reached from a category on /stats: that view keeps its own header (and
  // its "清除篩選" back to the plain list) instead of the filter bar.
  const fromCategory = sp.categoryId !== undefined && sp.categoryId !== "";

  return (
    <div className="flex flex-col gap-6">
      {fromCategory ? (
        <TransactionsFilterHeader
          icon={filterCategory?.icon ?? null}
          color={filterCategory?.color}
          name={filter?.categoryId === null ? "未分類" : (filterCategory?.name ?? "分類")}
          label={sp.label}
        />
      ) : (
        <>
          <PageHeader title="所有交易" back="/more" />
          <TransactionsFilterBar
            accounts={[...userAccounts, ...archivedAccounts].map((a) => ({ id: a.id, name: a.name, type: a.type }))}
            type={typeFilter}
            accountId={sp.account}
            start={sp.start}
            end={sp.end}
          />
        </>
      )}
      <TransactionsList
        // Remounted per filter so search text and paged-in rows from one
        // filter never linger under another.
        key={JSON.stringify(filter ?? {})}
        items={items}
        categories={userCategories}
        accounts={userAccounts
          .filter((a) => !a.excludeFromNetWorth)
          .map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency }))}
        accountsById={accountsById}
        initialCursor={initialCursor}
        frequentSplitNames={frequentSplitNames}
        filter={filter}
        emptyMessage={hasFilter ? "這個條件下沒有交易。" : undefined}
      />
    </div>
  );
}
