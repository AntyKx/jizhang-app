"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userSettings, aiSubscriptionStatusEnum } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isDevAdmin } from "@/lib/entitlements";

type AiSubscriptionStatus = (typeof aiSubscriptionStatusEnum.enumValues)[number];

// Re-checked here independently of the page's own gate — a locked-down
// resource must refuse to act even if someone reaches the action directly.
async function requireDevAdmin(): Promise<string> {
  const userId = await requireUserId();
  if (!isDevAdmin(userId)) throw new Error("此功能僅限開發者帳號使用");
  return userId;
}

export async function setOwnCoreUnlock(unlocked: boolean) {
  const userId = await requireDevAdmin();

  await db
    .insert(userSettings)
    .values({ userId, hasPurchasedCore: unlocked, corePurchasedAt: unlocked ? new Date() : null })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { hasPurchasedCore: unlocked, corePurchasedAt: unlocked ? new Date() : null },
    });

  revalidatePath("/dev-tools");
}

export async function setOwnAiSubscriptionStatus(status: AiSubscriptionStatus) {
  const userId = await requireDevAdmin();

  await db
    .insert(userSettings)
    .values({ userId, aiSubscriptionStatus: status })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { aiSubscriptionStatus: status },
    });

  revalidatePath("/dev-tools");
}
