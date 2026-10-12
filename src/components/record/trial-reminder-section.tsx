import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, aiUsageEvents, transactions, userSettings } from "@/db/schema";
import { daysSinceTrialEnded, isTrialActive, trialDaysRemaining } from "@/lib/entitlements";
import { TRIAL_DAYS } from "@/lib/trial";
import { todayInTaipeiString } from "@/lib/date";
import { TrialReminderCard } from "@/components/record/trial-reminder-card";

// Last day of the trial, and the first days after it ends — each shown on
// one day only (see TrialReminderCard), so it's two notices in total.
const REMIND_DAYS_BEFORE = 1;
const SHOW_DAYS_AFTER = 3;
const DAY_MS = 86_400_000;

// Own Suspense island on /record. Renders nothing for paid users, for
// trials with more than a day left, and once the trial ended over 3 days
// ago — so it costs one tiny settings read for almost everyone.
export async function TrialReminderSection({ userId }: { userId: string }) {
  const [settings] = await db
    .select({ hasPurchasedCore: userSettings.hasPurchasedCore, trialEndsAt: userSettings.trialEndsAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  const trialEndsAt = settings?.trialEndsAt;
  if (!settings || settings.hasPurchasedCore || !trialEndsAt) return null;

  const active = isTrialActive(trialEndsAt);
  const endedFor = daysSinceTrialEnded(trialEndsAt);
  if (active ? trialDaysRemaining(trialEndsAt) > REMIND_DAYS_BEFORE : endedFor > SHOW_DAYS_AFTER) return null;

  // What they did with the trial — the things they'd be giving up.
  const since = new Date(trialEndsAt.getTime() - TRIAL_DAYS * DAY_MS);
  const [[tx], [ai], [acct]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.createdAt, since))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(aiUsageEvents)
      .where(and(eq(aiUsageEvents.userId, userId), gte(aiUsageEvents.createdAt, since))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false))),
  ]);

  return (
    <TrialReminderCard
      variant={active ? "ending" : "ended"}
      storageKey={`jizhang:trial-${active ? "ending" : "ended"}:${trialEndsAt.toISOString()}`}
      today={todayInTaipeiString()}
      stats={[
        { label: "筆記帳", value: tx?.n ?? 0 },
        { label: "次一句話記帳", value: ai?.n ?? 0 },
        // Only worth calling out once it's more than the free tier's one.
        { label: "個帳戶", value: (acct?.n ?? 0) > 1 ? acct.n : 0 },
      ]}
    />
  );
}
