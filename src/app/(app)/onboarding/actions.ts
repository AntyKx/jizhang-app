"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, transactions, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { getDefaultAccountId } from "@/lib/account";

const setupSchema = z.object({
  type: z.enum(["cash", "bank", "credit_card", "e_wallet"]),
  name: z.string().trim().min(1).max(20),
  initialBalance: z.coerce.number().finite(),
});

// Finishes (or skips, when `setup` is null) the first-login welcome step.
// Instead of creating a second account — the free tier only allows one —
// it renames/retypes the auto-created default account and sets its
// starting balance, and only while that account is still untouched, so a
// stale or replayed submit can never rewrite an account already in use.
export async function completeOnboarding(setup: z.input<typeof setupSchema> | null) {
  const userId = await requireUserId();

  if (setup) {
    const parsed = setupSchema.parse(setup);
    const accountId = await getDefaultAccountId(userId);
    const [used] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .limit(1);

    if (!used) {
      const balance = parsed.initialBalance.toFixed(2);
      await db
        .update(accounts)
        .set({
          name: parsed.name,
          type: parsed.type,
          initialBalance: balance,
          // No transactions yet, so the running balance is exactly the
          // starting balance.
          currentBalance: balance,
        })
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    }
  }

  await db
    .update(userSettings)
    .set({ onboardedAt: sql`now()` })
    .where(eq(userSettings.userId, userId));

  revalidatePath("/", "layout");
}
