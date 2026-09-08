import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, userSettings } from "@/db/schema";
import { listAccounts, listArchivedAccounts } from "@/lib/account";
import { requireUserId } from "@/lib/auth";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { AccountsList } from "@/components/accounts/accounts-list";
import { TransferDialog } from "@/components/accounts/transfer-dialog";
import { TransferHistory } from "@/components/accounts/transfer-history";
import { BearIllustration } from "@/components/bear-illustration";
import { NetWorthSummary } from "@/components/accounts/net-worth-summary";
import { getExchangeRateToTwd } from "@/lib/fx";
import { todayInTaipeiString } from "@/lib/date";
import type { AccountType } from "@/lib/account-type";

export default async function AccountsPage() {
  const userId = await requireUserId();
  // Transfers are fetched unconditionally so all three reads share one round
  // trip — with fewer than two accounts the result is empty anyway, which the
  // render already handles.
  const [accounts, archivedAccounts, transfers, settingsRows] = await Promise.all([
    listAccounts(userId),
    listArchivedAccounts(userId),
    db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        feeAmount: transactions.feeAmount,
        occurredAt: transactions.occurredAt,
        note: transactions.note,
        fromAccountId: transactions.accountId,
        toAccountId: transactions.toAccountId,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "transfer")))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(20),
    db.select({ baseCurrency: userSettings.baseCurrency }).from(userSettings).where(eq(userSettings.userId, userId)),
  ]);
  const defaultCurrency = settingsRows[0]?.baseCurrency ?? "TWD";

  const allAccounts = [...accounts, ...archivedAccounts];
  const accountsById = Object.fromEntries(
    allAccounts.map((a) => [a.id, { name: a.name, type: a.type }]),
  );

  // Total across active accounts, in TWD. `getExchangeRateToTwd` short-
  // circuits to 1 for TWD without any network call, so an all-TWD setup (the
  // common case) costs nothing here. Rates are resolved once per distinct
  // currency (across *all* active accounts, not just net-worth-counted
  // ones — the per-type group subtotals below need excluded accounts'
  // rates too), in parallel, so a mixed-currency portfolio doesn't
  // serialise a lookup per account. If any lookup fails we show the
  // totals as unavailable rather than silently summing mixed currencies.
  let netWorth: number | null;
  let totalAssets: number | null;
  let totalLiabilities: number | null;
  let groupSubtotals: Partial<Record<AccountType, number>> = {};
  try {
    const today = todayInTaipeiString();
    const netWorthAccounts = accounts.filter((a) => !a.excludeFromNetWorth);
    const currencies = [...new Set(accounts.map((a) => a.currency))];
    const rates = new Map(
      await Promise.all(
        currencies.map(
          async (c) => [c, await getExchangeRateToTwd(c, today)] as const,
        ),
      ),
    );
    const toTwd = (a: (typeof accounts)[number]) => Number(a.currentBalance) * (rates.get(a.currency) ?? 1);

    netWorth = netWorthAccounts.reduce((sum, a) => sum + toTwd(a), 0);
    totalAssets = netWorthAccounts.reduce((sum, a) => sum + Math.max(0, toTwd(a)), 0);
    totalLiabilities = netWorthAccounts.reduce((sum, a) => sum + Math.min(0, toTwd(a)), 0);

    groupSubtotals = {};
    for (const a of accounts) {
      groupSubtotals[a.type] = (groupSubtotals[a.type] ?? 0) + toTwd(a);
    }
  } catch {
    netWorth = null;
    totalAssets = null;
    totalLiabilities = null;
    groupSubtotals = {};
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">帳戶管理</h1>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
            <TransferDialog
              accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency }))}
            />
          )}
          <CreateAccountDialog defaultCurrency={defaultCurrency} />
        </div>
      </div>

      {accounts.length > 0 && (
        <NetWorthSummary
          total={netWorth}
          accountCount={accounts.length}
          assets={totalAssets}
          liabilities={totalLiabilities}
        />
      )}

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <BearIllustration name="empty" size={96} />
          <p className="text-muted-foreground text-sm">還沒有任何帳戶。</p>
        </div>
      ) : (
        <AccountsList
          groupSubtotals={groupSubtotals}
          accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            currency: a.currency,
            currentBalance: a.currentBalance,
            excludeFromNetWorth: a.excludeFromNetWorth,
            initialBalance: a.initialBalance,
            statementDay: a.statementDay,
          }))}
        />
      )}

      {transfers.length > 0 && <TransferHistory transfers={transfers} accountsById={accountsById} />}

      {archivedAccounts.length > 0 && (
        <Link
          href="/accounts/archived"
          className="text-muted-foreground text-center text-sm underline underline-offset-4"
        >
          已封存帳戶（{archivedAccounts.length}）
        </Link>
      )}
    </div>
  );
}
