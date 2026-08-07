import Link from "next/link";
import { listArchivedAccounts } from "@/lib/account";
import { requireUserId } from "@/lib/auth";
import { ArchivedAccountsList } from "@/components/accounts/archived-accounts-list";

export default async function ArchivedAccountsPage() {
  const userId = await requireUserId();
  const archivedAccounts = await listArchivedAccounts(userId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/accounts" className="text-muted-foreground text-sm hover:text-foreground">
          ← 帳戶管理
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">已封存帳戶</h1>

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
          }))}
        />
      )}
    </div>
  );
}
