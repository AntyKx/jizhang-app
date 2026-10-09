import { cache } from "react";
import { clerkClient } from "@clerk/nextjs/server";
import { list } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { startOfMonth } from "date-fns";
import { db } from "@/db";
import {
  accounts,
  aiUsageEvents,
  budgets,
  recurringRules,
  savingsGoals,
  sharedExpenses,
  transactions,
  userSettings,
} from "@/db/schema";
import { dayFromPath } from "@/lib/backup-snapshots";
import { isTrialActive } from "@/lib/entitlements";
import { getTodayInTaipei } from "@/lib/date";

// Everything the /admin pages read, loaded once per request (cache()) and
// joined per user in JS. Fine at this app's scale (tens of users); if it
// ever reaches thousands, move the per-user joins into SQL.
//
// Deliberately aggregate-only: counts and dates, never amounts, notes,
// merchants or account names — the admin view is for product decisions,
// not for reading anyone's ledger.

export const CORE_PRICE_TWD = 120;
// Google Play's service fee for developers under US$1M/yr.
export const PLAY_FEE_RATE = 0.15;

export type PlanStatus = "paid" | "refunded" | "trial" | "free";

export const PLAN_LABEL: Record<PlanStatus, string> = {
  paid: "已解鎖",
  refunded: "已退款",
  trial: "試用中",
  free: "免費版",
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
  lastActiveAt: Date | null;
  lastSignInAt: Date | null;
  plan: PlanStatus;
  corePurchasedAt: Date | null;
  corePurchasePlatform: string | null;
  trialEndsAt: Date | null;
  onboardedAt: Date | null;
  aiSubscriptionStatus: string;
  accountCount: number;
  txTotal: number;
  tx30d: number;
  lastTxAt: Date | null;
  ai30d: number;
  aiThisMonth: number;
  budgetCount: number;
  goalCount: number;
  recurringCount: number;
  sharedCount: number;
  backupCount: number;
  latestBackupDay: string | null;
  backupBytes: number;
};

type Snapshot = { userId: string; day: string; size: number; uploadedAt: Date };

async function listAllSnapshots(): Promise<Snapshot[]> {
  const out: Snapshot[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "backups/", cursor, limit: 1000 });
    for (const b of page.blobs) {
      const match = /^backups\/([^/]+)\//.exec(b.pathname);
      const day = dayFromPath(b.pathname);
      if (match && day) out.push({ userId: match[1], day, size: b.size, uploadedAt: new Date(b.uploadedAt) });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

async function listAllClerkUsers() {
  const client = await clerkClient();
  const users = [];
  for (let offset = 0; ; offset += 100) {
    const page = await client.users.getUserList({ limit: 100, offset, orderBy: "-created_at" });
    users.push(...page.data);
    if (page.data.length < 100) break;
  }
  return users;
}

function groupCount<T extends { userId: string }>(rows: T[], pick: (r: T) => number) {
  return new Map(rows.map((r) => [r.userId, pick(r)]));
}

export const getAdminData = cache(async () => {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  // Same month boundary the quota check uses (entitlements.ts).
  const monthStart = startOfMonth(getTodayInTaipei());

  const [
    clerkUsers,
    settingsRows,
    acctRows,
    txRows,
    aiRows,
    budgetRows,
    goalRows,
    recurringRows,
    sharedRows,
    snapshots,
  ] = await Promise.all([
    listAllClerkUsers(),
    db.select().from(userSettings),
    db.select({ userId: accounts.userId, n: sql<number>`count(*)::int` }).from(accounts).groupBy(accounts.userId),
    db
      .select({
        userId: transactions.userId,
        total: sql<number>`count(*)::int`,
        last30: sql<number>`count(*) filter (where ${transactions.createdAt} >= ${since30})::int`,
        lastAt: sql<string | null>`max(${transactions.createdAt})`,
      })
      .from(transactions)
      .groupBy(transactions.userId),
    db
      .select({
        userId: aiUsageEvents.userId,
        last30: sql<number>`count(*) filter (where ${aiUsageEvents.createdAt} >= ${since30})::int`,
        thisMonth: sql<number>`count(*) filter (where ${aiUsageEvents.createdAt} >= ${monthStart})::int`,
      })
      .from(aiUsageEvents)
      .groupBy(aiUsageEvents.userId),
    db.select({ userId: budgets.userId, n: sql<number>`count(*)::int` }).from(budgets).groupBy(budgets.userId),
    db.select({ userId: savingsGoals.userId, n: sql<number>`count(*)::int` }).from(savingsGoals).groupBy(savingsGoals.userId),
    db
      .select({ userId: recurringRules.userId, n: sql<number>`count(*)::int` })
      .from(recurringRules)
      .groupBy(recurringRules.userId),
    db
      .select({ userId: sharedExpenses.userId, n: sql<number>`count(*)::int` })
      .from(sharedExpenses)
      .groupBy(sharedExpenses.userId),
    listAllSnapshots(),
  ]);

  const settingsBy = new Map(settingsRows.map((r) => [r.userId, r]));
  const acctBy = groupCount(acctRows, (r) => r.n);
  const txBy = new Map(txRows.map((r) => [r.userId, r]));
  const aiBy = new Map(aiRows.map((r) => [r.userId, r]));
  const budgetBy = groupCount(budgetRows, (r) => r.n);
  const goalBy = groupCount(goalRows, (r) => r.n);
  const recurringBy = groupCount(recurringRows, (r) => r.n);
  const sharedBy = groupCount(sharedRows, (r) => r.n);
  const snapsBy = new Map<string, Snapshot[]>();
  for (const s of snapshots) snapsBy.set(s.userId, [...(snapsBy.get(s.userId) ?? []), s]);

  // Clerk is the source of truth for who exists; DB-only ids (a deleted
  // Clerk user whose rows linger) are appended so nothing goes missing.
  const ids = new Set<string>(clerkUsers.map((u) => u.id));
  for (const r of settingsRows) ids.add(r.userId);
  const clerkBy = new Map(clerkUsers.map((u) => [u.id, u]));

  const users: AdminUser[] = [...ids].map((id) => {
    const u = clerkBy.get(id);
    const s = settingsBy.get(id);
    const tx = txBy.get(id);
    const ai = aiBy.get(id);
    const snaps = (snapsBy.get(id) ?? []).sort((a, b) => (a.day < b.day ? 1 : -1));

    let plan: PlanStatus = "free";
    if (s?.hasPurchasedCore) plan = "paid";
    else if (s?.corePurchasedAt) plan = "refunded";
    else if (isTrialActive(s?.trialEndsAt ?? null)) plan = "trial";

    return {
      id,
      name: u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || null : null,
      email: u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses[0]?.emailAddress ?? null,
      imageUrl: u?.imageUrl ?? null,
      createdAt: u ? new Date(u.createdAt) : (s?.createdAt ?? null),
      lastActiveAt: u?.lastActiveAt ? new Date(u.lastActiveAt) : null,
      lastSignInAt: u?.lastSignInAt ? new Date(u.lastSignInAt) : null,
      plan,
      corePurchasedAt: s?.corePurchasedAt ?? null,
      corePurchasePlatform: s?.corePurchasePlatform ?? null,
      trialEndsAt: s?.trialEndsAt ?? null,
      onboardedAt: s?.onboardedAt ?? null,
      aiSubscriptionStatus: s?.aiSubscriptionStatus ?? "none",
      accountCount: acctBy.get(id) ?? 0,
      txTotal: tx?.total ?? 0,
      tx30d: tx?.last30 ?? 0,
      lastTxAt: tx?.lastAt ? new Date(tx.lastAt) : null,
      ai30d: ai?.last30 ?? 0,
      aiThisMonth: ai?.thisMonth ?? 0,
      budgetCount: budgetBy.get(id) ?? 0,
      goalCount: goalBy.get(id) ?? 0,
      recurringCount: recurringBy.get(id) ?? 0,
      sharedCount: sharedBy.get(id) ?? 0,
      backupCount: snaps.length,
      latestBackupDay: snaps[0]?.day ?? null,
      backupBytes: snaps.reduce((sum, x) => sum + x.size, 0),
    };
  });

  users.sort((a, b) => (b.lastActiveAt?.getTime() ?? 0) - (a.lastActiveAt?.getTime() ?? 0));
  return { users, snapshots, generatedAt: now };
});

// Daily series for the overview/AI charts — bucketed by Taipei calendar day
// in SQL (created_at is stored as UTC wall time).
export const getDailyActivity = cache(async (days: number) => {
  const since = new Date(Date.now() - days * 86_400_000);
  const [tx, ai, signups] = await Promise.all([
    db.execute<{ day: string; n: number; users: number }>(sql`
      select to_char((created_at at time zone 'UTC') at time zone 'Asia/Taipei', 'YYYY-MM-DD') as day,
             count(*)::int as n, count(distinct user_id)::int as users
      from ${transactions} where created_at >= ${since} group by 1 order by 1`),
    db.execute<{ day: string; kind: string; n: number }>(sql`
      select to_char((created_at at time zone 'UTC') at time zone 'Asia/Taipei', 'YYYY-MM-DD') as day,
             kind, count(*)::int as n
      from ${aiUsageEvents} where created_at >= ${since} group by 1, 2 order by 1`),
    getAdminData(),
  ]);
  return { tx: tx.rows, ai: ai.rows, users: signups.users };
});

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
