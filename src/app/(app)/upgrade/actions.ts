"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { getSiteOrigin, stripe } from "@/lib/stripe";

async function getOrCreateStripeCustomerId(userId: string): Promise<string> {
  const [row] = await db
    .select({ stripeCustomerId: userSettings.stripeCustomerId })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  if (row?.stripeCustomerId) return row.stripeCustomerId;

  const user = await currentUser();
  const customer = await stripe.customers.create({
    email: user?.primaryEmailAddress?.emailAddress,
    metadata: { userId },
  });

  await db
    .insert(userSettings)
    .values({ userId, stripeCustomerId: customer.id })
    .onConflictDoUpdate({ target: userSettings.userId, set: { stripeCustomerId: customer.id } });

  return customer.id;
}

// The NT$120 all-in-one buyout — replaces the old separate NT$99 core-only
// checkout for new purchases. checkout.session.completed (mode "payment")
// always sets hasPurchasedCore=true regardless of which price was bought,
// so the webhook needs no change; entitlements.ts grants the AI usage cap
// bump off hasPurchasedCore alone.
export async function createAllInOneCheckoutSession() {
  const userId = await requireUserId();
  const customerId = await getOrCreateStripeCustomerId(userId);
  const origin = await getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: process.env.STRIPE_PRICE_ALL_IN_ONE!, quantity: 1 }],
    success_url: `${origin}/upgrade?status=success`,
    cancel_url: `${origin}/upgrade?status=canceled`,
  });

  redirect(session.url!);
}

export async function createAiSubscriptionCheckoutSession() {
  const userId = await requireUserId();
  const customerId = await getOrCreateStripeCustomerId(userId);
  const origin = await getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: process.env.STRIPE_PRICE_AI_SUBSCRIPTION!, quantity: 1 }],
    success_url: `${origin}/upgrade?status=success`,
    cancel_url: `${origin}/upgrade?status=canceled`,
  });

  redirect(session.url!);
}

export async function createBillingPortalSession() {
  const userId = await requireUserId();
  const [row] = await db
    .select({ stripeCustomerId: userSettings.stripeCustomerId })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  // Kept as a throw (not fail()) — this runs from a raw <form action={...}>
  // wired directly in a Server Component page, with no client-side handler
  // to ever read a returned Fail. A thrown error at least still surfaces the
  // generic Next.js error page; returning data here would just vanish
  // silently. Effectively unreachable in normal use anyway — the button
  // this backs only renders when isSubscribed is already true.
  if (!row?.stripeCustomerId) throw new Error("尚未建立訂閱");

  const origin = await getSiteOrigin();
  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: `${origin}/upgrade`,
  });

  redirect(session.url);
}
