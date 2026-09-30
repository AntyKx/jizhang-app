import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";

// Mirrors src/app/api/webhooks/stripe/route.ts's shape (verify signature ->
// resolve userId -> branch on event type -> upsert userSettings), but the
// userId resolution is simpler: app_user_id IS the Clerk userId directly,
// since the future Capacitor client configures the Purchases SDK with
// appUserID set to the Clerk userId at launch/login — no customer-id
// indirection to look up like Stripe needs.

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

const CORE_ENTITLEMENT = "core";
const AI_ENTITLEMENT = "ai_subscription";

type Store = "APP_STORE" | "PLAY_STORE" | "STRIPE" | "MAC_APP_STORE" | "AMAZON" | "RC_BILLING" | string;

function mapStore(store: Store): "app_store" | "play_store" | "stripe" | null {
  switch (store) {
    case "APP_STORE":
      return "app_store";
    case "PLAY_STORE":
      return "play_store";
    case "STRIPE":
      return "stripe";
    default:
      return null;
  }
}

// RevenueCat signs deliveries as `X-RevenueCat-Webhook-Signature:
// t=<unix_ts>,v1=<hex hmac-sha256>` over "<timestamp>.<raw_body>". Unlike
// Stripe's constructEvent, there's no SDK helper for this — verify by hand.
// Fails closed (rejects everything) when the secret isn't configured, same
// posture as the cron route refusing outright without CRON_SECRET: this
// route sits in proxy.ts's public allowlist from the moment it ships, long
// before RevenueCat is configured to actually call it.
function verifySignature(rawBody: string, header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    }),
  );
  const timestamp = parts.t;
  const providedSignature = parts.v1;
  if (!timestamp || !providedSignature) return false;

  // Symmetric tolerance, not just "not yet expired" — RevenueCat's clock and
  // this server's clock can each drift a little in either direction, so a
  // signature timestamped a few seconds in the "future" from this server's
  // point of view is still legitimate, not a replay.
  // `t` is unix SECONDS (per RevenueCat's docs), not milliseconds —
  // comparing it raw against Date.now() made every delivery look ~56 years
  // stale and rejected all of them.
  const age = Date.now() - Number(timestamp) * 1000;
  if (!Number.isFinite(age) || Math.abs(age) > SIGNATURE_MAX_AGE_MS) return false;

  const expectedSignature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  const expected = Buffer.from(expectedSignature, "hex");
  const provided = Buffer.from(providedSignature, "hex");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

// Upsert, not update: a purchase can arrive for an account that has never
// written a user_settings row (those are created lazily), and a plain UPDATE
// would silently match nothing and drop the purchase on the floor.
async function upsertSettings(userId: string, values: Partial<typeof userSettings.$inferInsert>) {
  await db
    .insert(userSettings)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userSettings.userId, set: values });
}

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  entitlement_ids?: string[];
  product_id?: string;
  store?: Store;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  cancel_reason?: string;
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-revenuecat-webhook-signature");

  if (!verifySignature(rawBody, signature, process.env.REVENUECAT_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { event: RevenueCatEvent };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const event = payload.event;
  const userId = event.app_user_id;
  // The client always configures RevenueCat with the Clerk userId, so an
  // anonymous id here means a purchase made before sign-in finished — there
  // is no account to credit, and upserting would create an orphan row.
  if (!userId || userId.startsWith("$RCAnonymousID")) {
    console.warn(`[webhooks/revenuecat] ignoring event for non-Clerk app_user_id ${userId}`);
    return NextResponse.json({ received: true });
  }
  const entitlements = event.entitlement_ids ?? [];
  const platform = mapStore(event.store ?? "");

  if (entitlements.includes(CORE_ENTITLEMENT) && event.type === "NON_RENEWING_PURCHASE") {
    await upsertSettings(userId, {
        hasPurchasedCore: true,
        corePurchasedAt: event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date(),
        corePurchasePlatform: platform,
      });
  }

  if (entitlements.includes(AI_ENTITLEMENT)) {
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "PRODUCT_CHANGE": {
        await upsertSettings(userId, {
            aiSubscriptionStatus: "active",
            aiSubscriptionCurrentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
            aiSubscriptionPlatform: platform,
          });
        break;
      }
      case "CANCELLATION": {
        // Fires both for "auto-renew turned off, still entitled until
        // period end" and for a real refund — only the refund case should
        // revoke immediately. The former just lets the subscription ride
        // out to its existing aiSubscriptionCurrentPeriodEnd and gets
        // revoked later by the EXPIRATION event.
        if (event.cancel_reason === "CUSTOMER_SUPPORT") {
          await upsertSettings(userId, { aiSubscriptionStatus: "canceled" });
        }
        break;
      }
      case "EXPIRATION": {
        await upsertSettings(userId, { aiSubscriptionStatus: "canceled" });
        break;
      }
      case "BILLING_ISSUE": {
        await upsertSettings(userId, { aiSubscriptionStatus: "past_due" });
        break;
      }
      case "TRANSFER": {
        // app_user_id is always the Clerk userId in this integration
        // (never RevenueCat's anonymous id), so purchases never need to be
        // merged across identities — this shouldn't normally fire.
        console.warn(`[webhooks/revenuecat] unexpected TRANSFER event for ${userId}`);
        break;
      }
    }
  }

  return NextResponse.json({ received: true });
}
