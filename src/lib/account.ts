import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";

export async function getDefaultAccountId(userId: string): Promise<string> {
  // Never auto-pick an account that's flagged "exclude from net worth" (e.g.
  // a fixed-deposit account) as the implicit destination for a recurring
  // rule or other automatic posting — if that leaves no candidate, falls
  // through to creating a fresh default account below, same as a brand-new
  // user with zero accounts.
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.isArchived, false),
        eq(accounts.excludeFromNetWorth, false),
      ),
    )
    .orderBy(accounts.createdAt)
    .limit(1);

  if (existing) return existing.id;

  // Same first-load race as seedDefaultCategories (concurrent server renders
  // all seeing "no account"): take a per-user advisory lock for the
  // transaction, and only insert if there's still no eligible account once
  // it's held. A racer that waited on the lock inserts nothing and falls
  // through to the re-select below, picking up the winner's account.
  await db.batch([
    db.execute(sql`select pg_advisory_xact_lock(hashtext(${`default-account:${userId}`}))`),
    db.execute(sql`
      insert into ${accounts} (user_id, name, type, currency)
      select ${userId}, '我的帳本', 'cash'::account_type, 'TWD'
      where not exists (
        select 1 from ${accounts}
        where user_id = ${userId} and is_archived = false and exclude_from_net_worth = false
      )
    `),
  ]);

  const [created] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.isArchived, false),
        eq(accounts.excludeFromNetWorth, false),
      ),
    )
    .orderBy(accounts.createdAt)
    .limit(1);

  return created.id;
}

export async function listAccounts(userId: string) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)))
    .orderBy(accounts.sortOrder, accounts.createdAt);
}

export async function listArchivedAccounts(userId: string) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, true)))
    .orderBy(accounts.sortOrder, accounts.createdAt);
}
