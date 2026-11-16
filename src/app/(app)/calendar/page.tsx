import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, parse, startOfMonth, subMonths } from "date-fns";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { accounts, categories, sharedExpenses, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { listAccounts, listArchivedAccounts } from "@/lib/account";
import { deriveSplitFields, getFrequentSplitNames } from "@/lib/shared-expenses";
import { CalendarView, type CalendarTransaction } from "@/components/calendar/calendar-view";
import { getTodayInTaipei } from "@/lib/date";
import { transferKind } from "@/lib/transactions/list-types";

export default async function CalendarPage({
  searchParams,
}: {
  // `day` is read on the client (CalendarView) — picking a day never comes
  // back through this page.
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;

  const today = getTodayInTaipei();
  const parsedMonth = params.month ? parse(params.month, "yyyy-MM", today) : today;
  // A malformed ?month= falls back to the current month instead of rendering
  // "Invalid Date" all over the grid.
  const monthDate = Number.isNaN(parsedMonth.getTime()) ? today : parsedMonth;
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthKey = format(monthDate, "yyyy-MM");
  const todayKey = format(today, "yyyy-MM-dd");

  // Aliased second join against the same table — the first join pulls a
  // transaction's OWN split-participant data (the 分帳 toggle on the
  // transaction itself); this one pulls the split EVENT a settlement
  // transaction was created to reimburse, the opposite direction, so
  // multiple settlements of one event can be collapsed into one display
  // group (see group-settlements.ts).
  const originExpense = alias(sharedExpenses, "originExpense");

  const [monthTransactionRows, userCategories, userAccounts, archivedAccounts, frequentSplitNames] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        exchangeRate: transactions.exchangeRate,
        feeAmount: transactions.feeAmount,
        occurredAt: transactions.occurredAt,
        createdAt: transactions.createdAt,
        merchant: transactions.merchant,
        note: transactions.note,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        paymentMethod: transactions.paymentMethod,
        accountId: transactions.accountId,
        toAccountId: transactions.toAccountId,
        accountName: accounts.name,
        sharedExpenseParticipants: sharedExpenses.participants,
        linkedSharedExpenseId: transactions.linkedSharedExpenseId,
        settlementGroupLabel: originExpense.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(sharedExpenses, eq(sharedExpenses.linkedTransactionId, transactions.id))
      .leftJoin(originExpense, eq(originExpense.id, transactions.linkedSharedExpenseId))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, format(monthStart, "yyyy-MM-dd")),
          lte(transactions.occurredAt, format(monthEnd, "yyyy-MM-dd")),
        ),
      )
      // Newest first within a day, same as the home page's today list.
      .orderBy(desc(transactions.createdAt)),
    db
      .select({ id: categories.id, name: categories.name, icon: categories.icon, color: categories.color, type: categories.type })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.sortOrder),
    listAccounts(userId),
    listArchivedAccounts(userId),
    getFrequentSplitNames(userId),
  ]);

  const monthTransactions: CalendarTransaction[] = monthTransactionRows.map((t) => {
    if (t.type === "income" || t.type === "expense") {
      const { sharedExpenseParticipants, ...rest } = t;
      return { ...rest, kind: "transaction", type: t.type, ...deriveSplitFields(sharedExpenseParticipants) };
    }
    return {
      ...transferKind(t.type),
      id: t.id,
      amount: t.amount,
      feeAmount: t.feeAmount,
      note: t.note,
      occurredAt: t.occurredAt,
      fromAccountId: t.accountId,
      toAccountId: t.toAccountId,
      linkedSharedExpenseId: null,
      settlementGroupLabel: null,
      exchangeRate: t.exchangeRate,
      createdAt: t.createdAt,
    };
  });

  const accountsById = Object.fromEntries(
    [...userAccounts, ...archivedAccounts].map((a) => [a.id, { name: a.name, type: a.type }]),
  );

  return (
    // Fixed to the viewport, not a normal-flow page — a drag over the
    // (short, in-flow) header inside it was still bubbling up to scroll
    // the actual document (nothing else on the page was tall enough to
    // need scrolling, but the page could still be dragged a little,
    // enough to visibly shift the calendar while trying to scroll the
    // detail pane below it). Taking this whole page out of flow the same
    // way the detail pane already is means body genuinely has zero
    // flow content left to scroll, with no JS touching body's own
    // styles this time — that's what broke env(safe-area-inset-bottom)
    // for the fixed bottom nav previously.
    <div
      className="fixed inset-0 mx-auto flex w-full max-w-md flex-col overflow-hidden px-4"
      // Being fixed/viewport-relative means this no longer sits inside
      // <main>'s own py-6 + body's safe-area-inset-top padding — without
      // reproducing it here, the header would render flush against the
      // true top edge, back under the status bar/notch on a real phone.
      // paddingBottom reserves the same room MainNav's fixed bottom bar
      // needs, so the transaction list's last rows scroll into view above
      // it instead of under it.
      style={{
        paddingTop: "calc(1.5rem + env(safe-area-inset-top))",
        paddingBottom: "calc(6rem + env(safe-area-inset-bottom))",
      }}
    >
      <CalendarView
        monthKey={monthKey}
        monthLabel={format(monthDate, "yyyy 年 M 月")}
        prevMonthKey={format(subMonths(monthDate, 1), "yyyy-MM")}
        nextMonthKey={format(addMonths(monthDate, 1), "yyyy-MM")}
        todayKey={todayKey}
        // Default to today's details on first load so there's no extra tap
        // needed — but only when today actually falls in the month being
        // viewed; flipping to a different month shouldn't auto-select a
        // date that isn't shown.
        defaultDay={monthKey === format(today, "yyyy-MM") ? todayKey : null}
        days={eachDayOfInterval({ start: monthStart, end: monthEnd }).map((d) => ({
          key: format(d, "yyyy-MM-dd"),
          label: format(d, "d"),
        }))}
        leadingBlanks={getDay(monthStart)}
        transactions={monthTransactions}
        categories={userCategories}
        accounts={userAccounts
          .filter((a) => !a.excludeFromNetWorth)
          .map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency }))}
        accountsById={accountsById}
        showAccount={userAccounts.length > 1}
        frequentSplitNames={frequentSplitNames}
      />
    </div>
  );
}
