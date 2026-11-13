import { listArchivedAccounts } from "@/lib/account";
import { requireUserId } from "@/lib/auth";
import { ArchivedAccountsList } from "@/components/accounts/archived-accounts-list";
import { PageHeader } from "@/components/page-header";

export default async function ArchivedAccountsPage() {
  const userId = await requireUserId();
  const archivedAccounts = await listArchivedAccounts(userId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="已封存帳戶" back="/accounts" />

      {archivedAccounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">目前沒有已封存的帳戶。</p>
      ) : (
        <ArchivedAccountsList
          accounts={archivedAccounts.map((a) => ({
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
    </div>
  );
}
