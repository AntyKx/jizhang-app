import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { listAccounts } from "@/lib/account";
import { AccountSettings } from "@/components/account/account-settings";
import { BackLink } from "@/components/back-link";

export default async function AccountPage() {
  const userId = await requireUserId();
  const [settingsRows, accounts] = await Promise.all([
    db
      .select({ baseCurrency: userSettings.baseCurrency, defaultAccountId: userSettings.defaultAccountId })
      .from(userSettings)
      .where(eq(userSettings.userId, userId)),
    listAccounts(userId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <BackLink href="/more" label="更多功能" />
      <h1 className="text-2xl font-semibold">帳號設定</h1>
      <AccountSettings
        baseCurrency={settingsRows[0]?.baseCurrency ?? "TWD"}
        defaultAccountId={settingsRows[0]?.defaultAccountId ?? null}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      />
    </div>
  );
}
