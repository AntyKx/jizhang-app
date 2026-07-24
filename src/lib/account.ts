import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";

export async function getDefaultAccountId(userId: string): Promise<string> {
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(accounts)
    .values({ userId, name: "我的帳本", type: "cash", currency: "TWD" })
    .returning({ id: accounts.id });

  return created.id;
}
