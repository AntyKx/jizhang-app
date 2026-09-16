import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { startOfMonth } from "date-fns";
import { db } from "@/db";
import { aiUsageEvents, userSettings } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";

// One-time, non-renewing — granted once per account the first time
// hasCoreAccess ever runs for it (new signups) or retroactively backfilled
// for pre-existing free accounts (see hasCoreAccess below).
const TRIAL_DAYS = 7;

function newTrialEndsAt(): Date {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function isTrialActive(trialEndsAt: Date | null | undefined): boolean {
  return trialEndsAt != null && trialEndsAt.getTime() > Date.now();
}

// For the /upgrade page's "試用中，還剩 N 天" banner — pulled out of that
// Server Component so its Date.now() read doesn't trip the
// components-must-be-pure lint rule.
export function trialDaysRemaining(trialEndsAt: Date | null | undefined): number {
  if (!isTrialActive(trialEndsAt)) return 0;
  return Math.max(1, Math.ceil((trialEndsAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

// Free-tier limits — starting values, expected to be tuned after launch
// against real usage (see docs/legal + monetization plan discussion).
const AI_RATE_LIMIT_PER_HOUR = 20;
const FREE_QUICK_ADD_PER_MONTH = 20;
const FREE_RECEIPT_SCAN_PER_MONTH = 5;
// Granted to anyone with hasPurchasedCore (the NT$120 all-in-one buyout now
// includes AI) but no separate recurring AI subscription — well above the
// heaviest real usage observed pre-launch (~36 calls/month) so it never
// bites a genuine user, while still bounding a compromised-account or
// scripted-abuse scenario. See docs/legal + monetization plan discussion.
const CORE_QUICK_ADD_CAP_PER_MONTH = 120;
const CORE_RECEIPT_SCAN_CAP_PER_MONTH = 30;
const SUBSCRIBED_SOFT_CAP_PER_MONTH = 1000;

export type AiUsageKind = "quick_add" | "receipt_scan" | "shared_quick_add";

// Gates the /dev-tools entitlement-testing panel to a single hardcoded
// account (via env var, not committed as a literal ID) — everyone else gets
// a 404, never a paywall message, so the page's existence isn't advertised.
export function isDevAdmin(userId: string): boolean {
  return Boolean(process.env.DEV_ADMIN_USER_ID) && userId === process.env.DEV_ADMIN_USER_ID;
}

export async function hasCoreAccess(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ hasPurchasedCore: userSettings.hasPurchasedCore, trialEndsAt: userSettings.trialEndsAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (!row) {
    // First time this account has ever touched a protected page/action —
    // start its one-time trial now. onConflictDoNothing covers a race with
    // another request creating the same row concurrently; whichever insert
    // wins, the trial window is the same to within milliseconds.
    await db.insert(userSettings).values({ userId, trialEndsAt: newTrialEndsAt() }).onConflictDoNothing();
    return true;
  }

  if (row.hasPurchasedCore) return true;
  if (row.trialEndsAt) return isTrialActive(row.trialEndsAt);

  // Pre-existing free account from before the trial feature shipped —
  // backfill its one-time trial retroactively, once, right now. Guarded on
  // trial_ends_at still being null so a concurrent request can't re-roll it.
  await db
    .update(userSettings)
    .set({ trialEndsAt: newTrialEndsAt() })
    .where(and(eq(userSettings.userId, userId), isNull(userSettings.trialEndsAt)));
  return true;
}

// Page-level gate — mirrors requireUserId()'s redirect convention. `from` is
// surfaced as a query param so /upgrade can tailor its message.
export async function requireCoreAccess(userId: string, from: string): Promise<void> {
  if (!(await hasCoreAccess(userId))) {
    redirect(`/upgrade?from=${encodeURIComponent(from)}`);
  }
}

// Route-handler gate — mirrors the manual auth() + 401 JSON convention
// already used by src/app/api/export/*/route.ts. Returns a response to
// return early with, or null when the caller may proceed.
export async function requireCoreAccessApi(userId: string): Promise<NextResponse | null> {
  if (await hasCoreAccess(userId)) return null;
  return NextResponse.json({ error: "此功能需要先解鎖核心功能" }, { status: 403 });
}

type AiUsageStatus = { allowed: true } | { allowed: false; reason: "rate_limited" | "quota_exceeded" };

// AI-cost endpoints (quick-add/receipt-scan/shared-quick-add) must check
// this before calling the model. Rate limit applies to every user
// regardless of plan — it's an abuse guard, not a billing feature.
export async function getAiUsageStatus(userId: string, kind: AiUsageKind): Promise<AiUsageStatus> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ count: recentCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageEvents)
    .where(and(eq(aiUsageEvents.userId, userId), gte(aiUsageEvents.createdAt, oneHourAgo)));
  if (recentCount >= AI_RATE_LIMIT_PER_HOUR) {
    return { allowed: false, reason: "rate_limited" };
  }

  const [settings] = await db
    .select({
      aiSubscriptionStatus: userSettings.aiSubscriptionStatus,
      hasPurchasedCore: userSettings.hasPurchasedCore,
      trialEndsAt: userSettings.trialEndsAt,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const monthStart = startOfMonth(getTodayInTaipei());
  const [{ count: monthCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageEvents)
    .where(
      and(
        eq(aiUsageEvents.userId, userId),
        eq(aiUsageEvents.kind, kind),
        gte(aiUsageEvents.createdAt, monthStart),
      ),
    );

  const monthlyLimit =
    settings?.aiSubscriptionStatus === "active"
      ? SUBSCRIBED_SOFT_CAP_PER_MONTH
      : settings?.hasPurchasedCore || isTrialActive(settings?.trialEndsAt)
        ? kind === "receipt_scan"
          ? CORE_RECEIPT_SCAN_CAP_PER_MONTH
          : CORE_QUICK_ADD_CAP_PER_MONTH
        : kind === "receipt_scan"
          ? FREE_RECEIPT_SCAN_PER_MONTH
          : FREE_QUICK_ADD_PER_MONTH;

  if (monthCount >= monthlyLimit) {
    return { allowed: false, reason: "quota_exceeded" };
  }

  return { allowed: true };
}

// Record a successful AI call only — never call this before the AI request
// completes, and never on failure (same "money-write after success, not
// before" principle used for the shared-ledger settlement flow).
export async function recordAiUsage(userId: string, kind: AiUsageKind): Promise<void> {
  await db.insert(aiUsageEvents).values({ userId, kind });
}
