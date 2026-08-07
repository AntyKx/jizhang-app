import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { formatDateInTaipei, getTodayInTaipei } from "@/lib/date";

export type NetWorthPoint = {
  monthLabel: string;
  netWorth: number;
};

// Base-currency (TWD) delta this transaction contributes to its own
// account's balance — transfers move money between two of the user's own
// accounts, so the transferred amount itself nets to zero across the whole
// portfolio, which is all this ever gets summed into (see getNetWorthTrend
// below). A transfer fee is real money leaving the portfolio though (paid to
// a bank/service, not to either account), so it still needs to be
// subtracted — this only appears once, on the source account's own row,
// since the fee is never applied to the destination account. No branch is
// needed for transfers between different currencies either — createTransfer
// only allows same-currency accounts.
function transactionDeltaBase(t: {
  type: string;
  amount: string;
  feeAmount: string;
  exchangeRate: string;
}): number {
  if (t.type === "expense") return -Number(t.amount) * Number(t.exchangeRate);
  if (t.type === "income") return Number(t.amount) * Number(t.exchangeRate);
  if (t.type === "transfer") return -Number(t.feeAmount) * Number(t.exchangeRate);
  return 0;
}

// Reconstructs net worth (in TWD) at each of the last N month-end boundaries
// by walking each account's transactions FORWARD from its initial balance,
// rather than backward from `currentBalance` — both the initial balance and
// every transaction already carry the exchange rate (account currency ->
// TWD) that was in effect when they were recorded, so summing them converts
// foreign-currency accounts into TWD terms without any live FX lookup here.
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
      .where(and(eq(accounts.userId, userId), eq(accounts.excludeFromNetWorth, false))),
    db
      .select({
        accountId: transactions.accountId,
        type: transactions.type,
        amount: transactions.amount,
        feeAmount: transactions.feeAmount,
        exchangeRate: transactions.exchangeRate,
        occurredAt: transactions.occurredAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
  ]);

  const txByAccount = new Map<string, typeof txRows>();
  for (const t of txRows) {
    const list = txByAccount.get(t.accountId);
    if (list) list.push(t);
    else txByAccount.set(t.accountId, [t]);
  }

  return boundaries.map((b) => {
    let netWorth = 0;
    for (const acc of accountRows) {
      if (formatDateInTaipei(acc.createdAt) > b.dateStr) continue;
      netWorth += Number(acc.initialBalance) * Number(acc.initialExchangeRate);
      const accountTxs = txByAccount.get(acc.id) ?? [];
      for (const t of accountTxs) {
        if (t.occurredAt <= b.dateStr) netWorth += transactionDeltaBase(t);
      }
    }
    return { monthLabel: b.label, netWorth };
  });
}
