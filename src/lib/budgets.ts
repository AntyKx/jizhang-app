import { format, startOfMonth } from "date-fns";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";

// Budgets are stored per month (`month` = first day). Without this, every
// budget silently vanished on the 1st — /budgets said "本月還沒有設定預算"
// and the home banner's progress bar disappeared until each one was set up
// again by hand.
//
// A row with limitAmount 0 is a "cleared" marker: written when the user
// deletes the last budget of the month, so a month emptied on purpose stays
// empty instead of being refilled from the month before on the next load,
// and so the month after it doesn't inherit anything either. Every reader
// filters it out with `activeBudget` below.

export function currentBudgetMonth(): string {
  return format(startOfMonth(getTodayInTaipei()), "yyyy-MM-dd");
}

// Rows that are real budgets (not the cleared marker).
export const activeBudget = gt(budgets.limitAmount, "0");

// Copies the most recent earlier month's budgets into the current month if
// the current month has none yet. Only ever fills the current month — a past
// month with no budget really had none, and that's what stats should show.
export async function ensureMonthBudgets(userId: string, month: string = currentBudgetMonth()): Promise<void> {
  if (month !== currentBudgetMonth()) return;

  const [existing] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)))
    .limit(1);
  if (existing) return;

  const [latest] = await db
    .select({ month: budgets.month })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), lt(budgets.month, month)))
    .orderBy(desc(budgets.month))
    .limit(1);
  if (!latest) return;

  const source = await db
    .select({ categoryId: budgets.categoryId, limitAmount: budgets.limitAmount })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, latest.month), activeBudget));
  if (source.length === 0) return;

  // Two sections of the same page can get here at once; the unique key
  // (user, category, month) makes the loser's insert a no-op.
  await db
    .insert(budgets)
    .values(source.map((b) => ({ userId, categoryId: b.categoryId, month, limitAmount: b.limitAmount })))
    .onConflictDoNothing();
}
