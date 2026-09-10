import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { sharedExpenses } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";

export type SharedMonthlyPoint = {
  monthLabel: string;
  owedToMe: number;
  iOwe: number;
};

// Total split spending per month (regardless of settled status) — a
// lightweight trend view so the split ledger has some sense of history,
// without a full separate stats section for what's meant to stay a simple
// feature. Broken down by direction (別人欠你 vs 你欠別人) instead of "me vs
// a fixed partner" now that a split event can name any counterparty.
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
      participants: sharedExpenses.participants,
      occurredAt: sharedExpenses.occurredAt,
    })
    .from(sharedExpenses)
    .where(and(eq(sharedExpenses.userId, userId), gte(sharedExpenses.occurredAt, buckets[0].startStr)));

  return buckets.map((b) => {
    let owedToMe = 0;
    let iOwe = 0;
    for (const r of rows) {
      if (r.occurredAt < b.startStr || r.occurredAt > b.endStr) continue;
      for (const p of r.participants) {
        if (p.iOwe) iOwe += Number(p.amount);
        else owedToMe += Number(p.amount);
      }
    }
    return { monthLabel: b.label, owedToMe, iOwe };
  });
}
