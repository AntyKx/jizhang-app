import { and, eq } from "drizzle-orm";
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

  const [created] = await db
    .insert(accounts)
    .values({ userId, name: "我的帳本", type: "cash", currency: "TWD" })
    .returning({ id: accounts.id });

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
