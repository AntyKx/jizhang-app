import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiUsageEvents, transactions, userSettings } from "@/db/schema";

// Shared by the (app) layout (welcome setup) and the home page (first-record
// prompt); cache() keeps it to one round trip per request.
export const getOnboardingState = cache(async (userId: string) => {
  const [[settings], [anyTransaction], [anyAi]] = await Promise.all([
    db.select({ onboardedAt: userSettings.onboardedAt }).from(userSettings).where(eq(userSettings.userId, userId)),
    db.select({ id: transactions.id }).from(transactions).where(eq(transactions.userId, userId)).limit(1),
    db.select({ id: aiUsageEvents.id }).from(aiUsageEvents).where(eq(aiUsageEvents.userId, userId)).limit(1),
  ]);
  const hasAnyTransaction = Boolean(anyTransaction);
  return {
    hasAnyTransaction,
    // Records by hand but has never tried one-line/voice/receipt quick-add —
    // the home page points them at the AI bar once.
    neverUsedAi: hasAnyTransaction && !anyAi,
    // Also requires "never recorded anything", so an older account can't be
    // shown the welcome step even if its settings row is somehow unmarked.
    needsWelcome: !settings?.onboardedAt && !hasAnyTransaction,
  };
});
