"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userSettings, aiSubscriptionStatusEnum, purchasePlatformEnum } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isDevAdmin } from "@/lib/entitlements";

type AiSubscriptionStatus = (typeof aiSubscriptionStatusEnum.enumValues)[number];
type PurchasePlatform = (typeof purchasePlatformEnum.enumValues)[number];

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

// Lets the /upgrade page's three-way "manage subscription" branch (Stripe
// billing portal vs. App Store vs. Play Store deep link) be checked on web
// without a real RevenueCat event — same simulate-without-paying pattern as
// the two actions above. `null` reproduces every pre-existing row (legacy,
// treated the same as "stripe" by the upgrade page).
export async function setOwnAiSubscriptionPlatform(platform: PurchasePlatform | null) {
  const userId = await requireDevAdmin();

  await db
    .insert(userSettings)
    .values({ userId, aiSubscriptionPlatform: platform })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { aiSubscriptionPlatform: platform },
    });

  revalidatePath("/dev-tools");
}
