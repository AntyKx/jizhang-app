import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { sharedExpenses } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";

export type SharedMonthlyPoint = {
  monthLabel: string;
  me: number;
  partner: number;
};

// Total joint spending per month (regardless of settled status) — a
// lightweight trend view so the couple's ledger has some sense of history,
// without a full separate stats section for what's meant to stay a simple,
// single-user feature.
export async function getMonthlySharedExpenseTrend(
  userId: string,
  months = 6,
): Promise<SharedMonthlyPoint[]> {
  const now = getTodayInTaipei();
  const buckets = Array.from({ length: months }, (_, i) => {
    const start = startOfMonth(subMonths(now, months - 1 - i));
    return {
      startStr: format(start, "yyyy-MM-dd"),
      endStr: format(endOfMonth(start), "yyyy-MM-dd"),
      label: format(start, "M月"),
    };
  });

  const rows = await db
    .select({
      amount: sharedExpenses.amount,
      paidByMe: sharedExpenses.paidByMe,
      occurredAt: sharedExpenses.occurredAt,
    })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.userId, userId), gte(sharedExpenses.occurredAt, buckets[0].startStr)));

  return buckets.map((b) => {
    let me = 0;
    let partner = 0;
    for (const r of rows) {
      if (r.occurredAt < b.startStr || r.occurredAt > b.endStr) continue;
      if (r.paidByMe) me += Number(r.amount);
      else partner += Number(r.amount);
    }
    return { monthLabel: b.label, me, partner };
  });
}
