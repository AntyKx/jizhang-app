import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";

const CORE_ENTITLEMENT = "core";

// Pull-based counterpart to src/app/api/webhooks/revenuecat: asks
// RevenueCat's REST API directly whether the signed-in user owns the core
// entitlement, and writes hasPurchasedCore if so. Backs the Android
// 「恢復購買」 button and the post-purchase refresh — the webhook is async
// (and retries give up eventually), so a purchase whose webhook never
// landed would otherwise stay locked forever with no way to recover.
// Only ever grants, never revokes: revocation stays webhook-driven.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const secretKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "恢復購買功能尚未設定完成" }, { status: 503 });
  }

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "無法查詢購買紀錄，請稍後再試" }, { status: 502 });
  }

  const body = (await res.json()) as {
    subscriber?: {
      entitlements?: Record<string, { expires_date: string | null; purchase_date?: string }>;
    };
  };
  const core = body.subscriber?.entitlements?.[CORE_ENTITLEMENT];
  const active = core && (core.expires_date == null || new Date(core.expires_date).getTime() > Date.now());
  if (!active) {
    return NextResponse.json({ hasPurchasedCore: false });
  }

  // Already unlocked (maybe via a web/Stripe purchase) — leave the original
  // purchase date/platform alone.
  const [existing] = await db
    .select({ hasPurchasedCore: userSettings.hasPurchasedCore })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  if (existing?.hasPurchasedCore) {
    return NextResponse.json({ hasPurchasedCore: true });
  }

  const values = {
    hasPurchasedCore: true,
    corePurchasedAt: core.purchase_date ? new Date(core.purchase_date) : new Date(),
    corePurchasePlatform: "play_store" as const,
  };
  await db
    .insert(userSettings)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userSettings.userId, set: values });

  return NextResponse.json({ hasPurchasedCore: true });
}
