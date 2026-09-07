import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { accounts, categories, sharedExpenses, transactions, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { listAccounts } from "@/lib/account";
import { PaymentMethodIcon } from "@/components/transactions/payment-method-icon";
import { CategoryIcon } from "@/components/category-icon";
import { TodayTransactionRow } from "@/components/record/today-transaction-row";
import { BearIllustration } from "@/components/bear-illustration";
import { heatmapLevel, SEQUENTIAL_HEATMAP_STEPS, SEQUENTIAL_HEATMAP_TEXT } from "@/components/stats/chart-colors";
import { StaggerList } from "@/components/motion/stagger-list";
import { getTodayInTaipei } from "@/lib/date";
import { cn } from "@/lib/utils";

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;

  const today = getTodayInTaipei();
  const monthDate = params.month ? parse(params.month, "yyyy-MM", today) : today;
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthKey = format(monthDate, "yyyy-MM");
  const prevMonthKey = format(subMonths(monthDate, 1), "yyyy-MM");
  const nextMonthKey = format(addMonths(monthDate, 1), "yyyy-MM");
  // Default to today's details on first load so there's no extra tap needed
  // — but only when today actually falls in the month being viewed; flipping
  // to a different month shouldn't auto-select a date that isn't shown.
  const todayKey = format(today, "yyyy-MM-dd");
  const selectedDay = params.day ?? (monthKey === format(today, "yyyy-MM") ? todayKey : null);

  const [monthTransactionRows, userCategories, userAccounts, settingsRows] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        exchangeRate: transactions.exchangeRate,
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
        accountName: accounts.name,
        sharedExpenseId: sharedExpenses.id,
        sharedExpensePaidByMe: sharedExpenses.paidByMe,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(sharedExpenses, eq(sharedExpenses.linkedTransactionId, transactions.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, format(monthStart, "yyyy-MM-dd")),
          lte(transactions.occurredAt, format(monthEnd, "yyyy-MM-dd")),
        ),
      ),
    db
      .select({ id: categories.id, name: categories.name, icon: categories.icon, color: categories.color, type: categories.type })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.sortOrder),
    listAccounts(userId),
    db
      .select({ partnerName: userSettings.partnerName })
      .from(userSettings)
      .where(eq(userSettings.userId, userId)),
  ]);

  const partnerName = settingsRows[0]?.partnerName || "另一半";
  const monthTransactions = monthTransactionRows.map((t) => ({
    ...t,
    isSharedExpense: t.sharedExpenseId !== null,
    paidByMe: t.sharedExpensePaidByMe ?? true,
  }));

  const byDay = new Map<string, { income: number; expense: number }>();
  for (const t of monthTransactions) {
    const entry = byDay.get(t.occurredAt) ?? { income: 0, expense: 0 };
    const amount = Number(t.amount) * Number(t.exchangeRate);
    if (t.type === "income") entry.income += amount;
    else if (t.type === "expense") entry.expense += amount;
    byDay.set(t.occurredAt, entry);
  }

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart);
  const maxExpense = Math.max(0, ...[...byDay.values()].map((e) => e.expense));

  const selectedTransactions = selectedDay
    ? monthTransactions.filter((t) => t.occurredAt === selectedDay)
    : [];
  // `TodayTransactionRow` (tap-to-edit, swipe-to-delete/duplicate, long-press
  // quick-category — same component the home page's "今天記了 N 筆" list
  // uses) only understands income/expense; transfers have no single
  // category/account to edit against, so they keep the simple read-only row
  // below instead of silently disappearing from the day's details.
  const editableTransactions = selectedTransactions.filter(
    (t): t is typeof t & { type: "income" | "expense" } => t.type === "income" || t.type === "expense",
  );
  const transferTransactions = selectedTransactions.filter((t) => t.type === "transfer");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?month=${prevMonthKey}`}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="上個月"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-xl font-semibold">{format(monthDate, "yyyy 年 M 月")}</h1>
        <Link
          href={`/calendar?month=${nextMonthKey}`}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="下個月"
        >
          <ChevronRight className="size-5" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekdays.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <StaggerList className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const entry = byDay.get(key);
            const isSelected = selectedDay === key;
            const isToday = key === todayKey;
            const level = heatmapLevel(entry?.expense ?? 0, maxExpense);
            const textColor = SEQUENTIAL_HEATMAP_TEXT[level];
            const titleParts = [
              entry?.expense ? `支出 ${Math.round(entry.expense).toLocaleString("zh-TW")}` : null,
              entry?.income ? `收入 ${Math.round(entry.income).toLocaleString("zh-TW")}` : null,
            ].filter(Boolean);
            return (
              <Link
                key={key}
                href={`/calendar?month=${monthKey}&day=${key}`}
                title={titleParts.length > 0 ? `${key}・${titleParts.join("・")}` : key}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-center tabular-nums transition-all",
                  isSelected
                    ? "z-10 scale-105 shadow-md ring-2 ring-primary ring-offset-2 ring-offset-card"
                    : "hover:ring-1 hover:ring-muted-foreground/30",
                )}
                style={{ backgroundColor: SEQUENTIAL_HEATMAP_STEPS[level], color: textColor }}
              >
                <span className={cn("text-xs", level >= 3 && "font-medium")}>{format(d, "d")}</span>
                {/* "Today" no longer relies on a ring (that's the isSelected
                    signal now) — a small dot in the day's own text color
                    stays visible no matter how intense that day's heat
                    color is. */}
                {isToday && (
                  <span className="size-1 rounded-full" style={{ backgroundColor: textColor }} />
                )}
                {entry?.income ? (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-emerald-500" />
                ) : null}
              </Link>
            );
          })}
        </StaggerList>
      </div>

      {selectedDay && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{selectedDay}</span>
            {(() => {
              const dayTotals = byDay.get(selectedDay);
              if (!dayTotals || (dayTotals.expense === 0 && dayTotals.income === 0)) return null;
              return (
                <div className="flex gap-3 text-sm font-semibold tabular-nums">
                  {dayTotals.expense > 0 && (
                    <span className="text-destructive">-{Math.round(dayTotals.expense).toLocaleString("zh-TW")}</span>
                  )}
                  {dayTotals.income > 0 && (
                    <span className="text-emerald-600">+{Math.round(dayTotals.income).toLocaleString("zh-TW")}</span>
                  )}
                </div>
              );
            })()}
          </div>
          {selectedTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <BearIllustration name="empty" size={96} />
              <p className="text-muted-foreground text-sm">這天還沒有記帳紀錄喔！</p>
            </div>
          ) : (
            <>
              {editableTransactions.length > 0 && (
                <StaggerList className="flex flex-col divide-y">
                  {editableTransactions.map((t) => (
                    <TodayTransactionRow
                      key={t.id}
                      transaction={t}
                      categories={userCategories}
                      accounts={userAccounts.filter((a) => !a.excludeFromNetWorth)}
                      showAccount={userAccounts.length > 1}
                      partnerName={partnerName}
                    />
                  ))}
                </StaggerList>
              )}

              {transferTransactions.length > 0 && (
                <StaggerList className="flex flex-col divide-y">
                  {transferTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CategoryIcon icon={t.categoryIcon} className="h-6 w-6 text-xl" />
                        <span className="text-sm">{t.merchant || t.note || "轉帳"}</span>
                        <PaymentMethodIcon method={t.paymentMethod} className="text-muted-foreground" />
                      </div>
                      <span className="text-sm font-semibold">
                        {Number(t.amount).toLocaleString("zh-TW")}
                      </span>
                    </div>
                  ))}
                </StaggerList>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
