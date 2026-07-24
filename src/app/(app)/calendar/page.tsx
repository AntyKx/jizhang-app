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
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { paymentMethodIcon, paymentMethodLabel } from "@/lib/payment-methods";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;

  const today = new Date();
  const monthDate = params.month ? parse(params.month, "yyyy-MM", new Date()) : today;
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthKey = format(monthDate, "yyyy-MM");
  const prevMonthKey = format(subMonths(monthDate, 1), "yyyy-MM");
  const nextMonthKey = format(addMonths(monthDate, 1), "yyyy-MM");
  const selectedDay = params.day ?? null;

  const monthTransactions = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      occurredAt: transactions.occurredAt,
      merchant: transactions.merchant,
      note: transactions.note,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      paymentMethod: transactions.paymentMethod,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, format(monthStart, "yyyy-MM-dd")),
        lte(transactions.occurredAt, format(monthEnd, "yyyy-MM-dd")),
      ),
    );

  const byDay = new Map<string, { income: number; expense: number }>();
  for (const t of monthTransactions) {
    const entry = byDay.get(t.occurredAt) ?? { income: 0, expense: 0 };
    if (t.type === "income") entry.income += Number(t.amount);
    else if (t.type === "expense") entry.expense += Number(t.amount);
    byDay.set(t.occurredAt, entry);
  }

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart);

  const selectedTransactions = selectedDay
    ? monthTransactions.filter((t) => t.occurredAt === selectedDay)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?month=${prevMonthKey}`}
          className="rounded-full px-3 py-1 text-sm hover:bg-muted"
        >
          ← 上個月
        </Link>
        <h1 className="text-xl font-semibold">{format(monthDate, "yyyy 年 M 月")}</h1>
        <Link
          href={`/calendar?month=${nextMonthKey}`}
          className="rounded-full px-3 py-1 text-sm hover:bg-muted"
        >
          下個月 →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {weekdays.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const entry = byDay.get(key);
          const isSelected = selectedDay === key;
          const isToday = key === format(today, "yyyy-MM-dd");
          return (
            <Link
              key={key}
              href={`/calendar?month=${monthKey}&day=${key}`}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl border p-1.5 text-center transition-colors",
                isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted",
                isToday && !isSelected && "border-primary/40",
              )}
            >
              <span className="text-xs">{format(d, "d")}</span>
              {entry?.expense ? (
                <span className="text-[10px] text-destructive">-{Math.round(entry.expense)}</span>
              ) : null}
              {entry?.income ? (
                <span className="text-[10px] text-emerald-600">+{Math.round(entry.income)}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {selectedDay && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">{selectedDay}</span>
          {selectedTransactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">這天沒有記帳紀錄。</p>
          ) : (
            <div className="flex flex-col divide-y rounded-2xl border bg-card">
              {selectedTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CategoryIcon icon={t.categoryIcon} className="h-6 w-6 text-xl" />
                    <span className="text-sm">{t.merchant || t.note || t.categoryName || "（無備註）"}</span>
                    <span className="text-xs" title={paymentMethodLabel(t.paymentMethod)}>
                      {paymentMethodIcon(t.paymentMethod)}
                    </span>
                  </div>
                  <span
                    className={
                      t.type === "expense"
                        ? "text-sm font-semibold text-destructive"
                        : "text-sm font-semibold text-emerald-600"
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
      )}
    </div>
  );
}
