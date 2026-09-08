"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isSupportedCurrency } from "@/lib/currency";
import { fail } from "@/lib/action-result";

export async function updateBaseCurrency(currency: string) {
  const userId = await requireUserId();
  if (!isSupportedCurrency(currency)) return fail("不支援的幣別");

  await db
    .insert(userSettings)
    .values({ userId, baseCurrency: currency })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { baseCurrency: currency },
    });

  revalidatePath("/account");
  revalidatePath("/accounts");
}

export async function updateDefaultAccountId(accountId: string | null) {
  const userId = await requireUserId();

  if (accountId) {
    const [owned] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    if (!owned) return fail("找不到指定的帳戶");
  }

  await db
    .insert(userSettings)
    .values({ userId, defaultAccountId: accountId })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { defaultAccountId: accountId },
    });

  // The FAB reads this via getQuickAddContext from the (app) layout, which
  // wraps every route — revalidate broadly so the new default takes effect
  // immediately instead of only after the next hard navigation.
  revalidatePath("/", "layout");
}
