"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";

// Resolves once RevenueCat is configured AND identified as the current Clerk
// user — the purchase/restore buttons await this so a tap that lands before
// the SDK finished setting up can't fail or, worse, attribute the purchase to
// the wrong (or an anonymous) app user id.
let ready: Promise<void> | null = null;

async function identify(userId: string) {
  const { isConfigured } = await Purchases.isConfigured();
  if (!isConfigured) {
    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    if (!apiKey) throw new Error("RevenueCat API key missing");
    await Purchases.configure({ apiKey, appUserID: userId });
    return;
  }
  // configure() is meant to run once per app launch — switching accounts on
  // an already-configured SDK goes through logIn instead.
  const { appUserID } = await Purchases.getAppUserID();
  if (appUserID !== userId) await Purchases.logIn({ appUserID: userId });
}

export function getPurchasesReady(): Promise<void> {
  return ready ?? Promise.reject(new Error("RevenueCat not initialised"));
}

// Keeps RevenueCat's appUserID = Clerk userId, matching what
// src/app/api/webhooks/revenuecat/route.ts assumes (app_user_id IS the Clerk
// userId directly). Re-runs whenever the signed-in user changes so a device
// shared across accounts never attributes a purchase to the wrong one.
export function NativePurchasesInit() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isLoaded) return;

    if (userId) {
      ready = identify(userId);
      ready.catch((err) => console.error("[purchases] init failed", err));
      return;
    }

    // Signed out — detach the previous user so the next purchase can't be
    // credited to them. logOut throws if the current user is already
    // anonymous, which is fine to ignore.
    ready = null;
    Purchases.isConfigured()
      .then(({ isConfigured }) => (isConfigured ? Purchases.logOut() : undefined))
      .catch(() => {});
  }, [isLoaded, userId]);

  return null;
}
