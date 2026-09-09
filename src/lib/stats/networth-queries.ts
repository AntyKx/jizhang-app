import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { formatDateInTaipei, getTodayInTaipei } from "@/lib/date";

export type NetWorthPoint = {
  monthLabel: string;
  netWorth: number;
};

// Reconstructs net worth (in TWD) at each of the last N month-end boundaries
// by walking transactions FORWARD from each account's initial balance,
// rather than backward from `currentBalance` — both the initial balance and
// every transaction already carry the exchange rate (account currency ->
// TWD) that was in effect when they were recorded, so summing them converts
// foreign-currency accounts into TWD terms without any live FX lookup here.
//
// "Counted" is deliberately the same set the /accounts headline totals use:
// not archived, not flagged excludeFromNetWorth. Including archived accounts
// here (as this used to) made the trend chart disagree with the headline
// number on the very same screen.
export async function getNetWorthTrend(userId: string, months = 6): Promise<NetWorthPoint[]> {
  const now = getTodayInTaipei();

  const boundaries = Array.from({ length: months }, (_, i) => {
    const monthStart = startOfMonth(subMonths(now, months - 1 - i));
    const monthEnd = endOfMonth(monthStart);
    const boundary = monthEnd > now ? now : monthEnd;
    return { label: format(monthStart, "M月"), dateStr: format(boundary, "yyyy-MM-dd") };
  });

  const [accountRows, txRows] = await Promise.all([
    db
      .select({
        id: accounts.id,
        initialBalance: accounts.initialBalance,
        initialExchangeRate: accounts.initialExchangeRate,
        createdAt: accounts.createdAt,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.excludeFromNetWorth, false),
          eq(accounts.isArchived, false),
        ),
      ),
    db
      .select({
        accountId: transactions.accountId,
        toAccountId: transactions.toAccountId,
        type: transactions.type,
        amount: transactions.amount,
        feeAmount: transactions.feeAmount,
        exchangeRate: transactions.exchangeRate,
        occurredAt: transactions.occurredAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
  ]);

  // Counted at a given boundary means: in the counted set at all, and
  // already created by then — an account's transactions only start counting
  // from the same boundary its opening balance does, so a backdated entry
  // can't land against an account that doesn't exist yet on that point of
  // the curve.
  const createdAtById = new Map(accountRows.map((a) => [a.id, formatDateInTaipei(a.createdAt)]));
  const countsAt = (accountId: string | null, boundary: string) => {
    if (!accountId) return false;
    const createdAt = createdAtById.get(accountId);
    return createdAt !== undefined && createdAt <= boundary;
  };

  // How much this transaction moved the *counted* portfolio, which is not
  // the same as how much it moved its own account. A transfer between two
  // counted accounts nets to just its fee (the amount leaves one and
  // arrives in the other), but a transfer whose other side sits outside the
  // counted set — say into a 定存 account flagged "不記入資產" — really does
  // take that money out of net worth, so each leg has to be judged on its
  // own rather than assumed to cancel.
  function countedDelta(t: (typeof txRows)[number], boundary: string): number {
    const rate = Number(t.exchangeRate);
    if (t.type === "transfer") {
      let delta = 0;
      if (countsAt(t.accountId, boundary)) delta -= (Number(t.amount) + Number(t.feeAmount)) * rate;
      if (countsAt(t.toAccountId, boundary)) delta += Number(t.amount) * rate;
      return delta;
    }
    if (!countsAt(t.accountId, boundary)) return 0;
    if (t.type === "expense") return -Number(t.amount) * rate;
    if (t.type === "income") return Number(t.amount) * rate;
    return 0;
  }

  return boundaries.map((b) => {
    let netWorth = 0;
    for (const acc of accountRows) {
      if (formatDateInTaipei(acc.createdAt) > b.dateStr) continue;
      netWorth += Number(acc.initialBalance) * Number(acc.initialExchangeRate);
    }
    for (const t of txRows) {
      if (t.occurredAt <= b.dateStr) netWorth += countedDelta(t, b.dateStr);
    }
    return { monthLabel: b.label, netWorth };
  });
}
