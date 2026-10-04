"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
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

// Server-side via the Backend API, not the browser's user.update() — the
// production Clerk instance has the first/last-name attribute disabled
// (so it isn't asked at sign-up), and the Frontend API rejects writes to a
// disabled attribute. The Backend API isn't bound by that setting.
export async function updateDisplayName(name: string) {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) return fail("請輸入姓名");
  if (trimmed.length > 50) return fail("姓名最多 50 個字");

  try {
    const client = await clerkClient();
    await client.users.updateUser(userId, { firstName: trimmed });
  } catch {
    return fail("姓名更新失敗，請稍後再試");
  }
}
