import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { stripe } from "@/lib/stripe";

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "none" | "active" | "past_due" | "canceled" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "none";
  }
}

async function findUserIdByCustomerId(customerId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.stripeCustomerId, customerId));
  return row?.userId ?? null;
}

// current_period_end lives on the subscription item, not the subscription
// itself, as of this SDK version — see node_modules/stripe's
// SubscriptionItems type, not Subscriptions.
async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = await findUserIdByCustomerId(customerId);
  if (!userId) return;

  const periodEnd = subscription.items.data[0]?.current_period_end;

  await db
    .update(userSettings)
    .set({
      stripeSubscriptionId: subscription.id,
      aiSubscriptionStatus: mapSubscriptionStatus(subscription.status),
      aiSubscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    })
    .where(eq(userSettings.userId, userId));
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        const customerId =
          typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
        const userId = (customerId && (await findUserIdByCustomerId(customerId))) || session.client_reference_id;
        if (userId) {
          await db
            .update(userSettings)
            .set({ hasPurchasedCore: true, corePurchasedAt: new Date() })
            .where(eq(userSettings.userId, userId));
        }
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
