import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, or, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { accounts, categories, sharedExpenses, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { listAccounts, listArchivedAccounts } from "@/lib/account";
import { deriveSplitFields, getFrequentSplitNames } from "@/lib/shared-expenses";
import { resolveStatsRange } from "@/lib/stats/range";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { AccountMonthNav } from "@/components/accounts/account-month-nav";
import { AccountDetailTabs } from "@/components/accounts/account-detail-tabs";
import { accountTypeLabels } from "@/lib/account-type";
import type { ListItemRow } from "@/lib/transactions/list-types";

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const sp = await searchParams;
  // Deliberately ignores any `range` query param — an account's detail view
  // only ever makes sense browsed month by month (see AccountMonthNav).
  const range = resolveStatsRange({ date: sp.date });

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  if (!account) notFound();

  // Aliased second join against the same table — the first join (below)
  // pulls a transaction's OWN split-participant data (the 分帳 toggle on the
  // transaction itself); this one pulls the split EVENT a settlement
  // transaction was created to reimburse, the opposite direction, so
  // multiple settlements of one event can be collapsed into one display
  // group (see group-settlements.ts).
  const originExpense = alias(sharedExpenses, "originExpense");

  const [regularRows, transferRows, userCategories, userAccounts, archivedAccounts, frequentSplitNames] =
    await Promise.all([
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
            eq(transactions.accountId, id),
            ne(transactions.type, "transfer"),
            gte(transactions.occurredAt, range.startStr),
            lte(transactions.occurredAt, range.endStr),
          ),
        )
        .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt)),
      db
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
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "transfer"),
            or(eq(transactions.accountId, id), eq(transactions.toAccountId, id)),
            gte(transactions.occurredAt, range.startStr),
            lte(transactions.occurredAt, range.endStr),
          ),
        )
        .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt)),
      db
        .select({ id: categories.id, name: categories.name, icon: categories.icon, color: categories.color, type: categories.type })
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

  const monthIncome = regularRows
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const monthExpense = regularRows
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const listItems: ListItemRow[] = [
    ...regularRows.map((t) => {
      const { sharedExpenseParticipants, ...rest } = t;
      return {
        ...rest,
        kind: "transaction" as const,
        type: t.type as "income" | "expense",
        ...deriveSplitFields(sharedExpenseParticipants),
      };
    }),
    ...transferRows.map((t) => ({ ...t, kind: "transfer" as const, linkedSharedExpenseId: null, settlementGroupLabel: null })),
  ].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/accounts" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AccountTypeIcon type={account.type} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold leading-tight">{account.name}</h1>
          <span className="text-muted-foreground text-xs">{accountTypeLabels[account.type]}</span>
        </div>
      </div>

      <AccountMonthNav basePath={`/accounts/${id}`} range={range} />

      <AccountDetailTabs
        monthLabel={range.label}
        currentBalance={account.currentBalance}
        currency={account.currency}
        monthIncome={monthIncome}
        monthExpense={monthExpense}
        listItems={listItems}
        categories={userCategories}
        accounts={userAccounts
          .filter((a) => !a.excludeFromNetWorth)
          .map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency }))}
        accountsById={accountsById}
        frequentSplitNames={frequentSplitNames}
      />
    </div>
  );
}
