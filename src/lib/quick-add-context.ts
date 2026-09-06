import { cache } from "react";
import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, userSettings } from "@/db/schema";
import { getDefaultAccountId, listAccounts } from "@/lib/account";
import type { AccountType } from "@/lib/account-type";

export type QuickAddCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: "income" | "expense";
};
export type QuickAddAccount = { id: string; name: string; type: AccountType };

// Shared by every surface that can trigger a quick-add flow (the /record
// page and the global FAB rendered from the (app) layout on every page) so
// both read categories/accounts/partnerName the same way, including the
// "lazily create 我的帳本 for a brand-new user" fallback that used to live
// only in record/page.tsx. Wrapped in React's `cache()` so the layout and a
// page that both call this on the same request (e.g. /record) only hit the
// DB once — the second call just returns the memoized result.
export const getQuickAddContext = cache(async (userId: string): Promise<{
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  partnerName: string;
}> => {
  const [userCategories, accountRows, settingsRows] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        type: categories.type,
      })
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId)))
      .orderBy(categories.sortOrder),
    listAccounts(userId),
    db.select({ partnerName: userSettings.partnerName }).from(userSettings).where(eq(userSettings.userId, userId)),
  ]);

  // Accounts flagged "exclude from net worth" (e.g. a fixed-deposit account)
  // are deliberately left out of the quick-add account picker — they're
  // still real accounts, just not ones you'd post a normal income/expense
  // against. If that leaves no candidate at all, fall back to creating a
  // fresh default account, same as a brand-new user with zero accounts.
  let userAccounts = accountRows.filter((a) => !a.excludeFromNetWorth);
  if (userAccounts.length === 0) {
    await getDefaultAccountId(userId);
    userAccounts = (await listAccounts(userId)).filter((a) => !a.excludeFromNetWorth);
  }

  return {
    categories: userCategories,
    accounts: userAccounts.map((a) => ({ id: a.id, name: a.name, type: a.type as AccountType })),
    partnerName: settingsRows[0]?.partnerName || "另一半",
  };
});
