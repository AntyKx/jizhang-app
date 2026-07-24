"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { recurringRules } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { getDefaultAccountId } from "@/lib/account";

const createRuleSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(50),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.coerce.number().int().positive().default(1),
  nextOccurrence: z.string().min(1),
  isSubscription: z.coerce.boolean().optional(),
});

export async function createRecurringRule(formData: FormData) {
  const userId = await requireUserId();
  const categoryIdRaw = formData.get("categoryId");
  const parsed = createRuleSchema.parse({
    categoryId: categoryIdRaw ? String(categoryIdRaw) : undefined,
    name: formData.get("name"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    frequency: formData.get("frequency"),
    interval: formData.get("interval") || 1,
    nextOccurrence: formData.get("nextOccurrence"),
    isSubscription: formData.get("isSubscription") === "on",
  });
  const accountId = await getDefaultAccountId(userId);

  await db.insert(recurringRules).values({
    userId,
    accountId,
    categoryId: parsed.categoryId,
    name: parsed.name,
    amount: parsed.amount.toString(),
    type: parsed.type,
    frequency: parsed.frequency,
    interval: parsed.interval,
    nextOccurrence: parsed.nextOccurrence,
    isSubscription: parsed.isSubscription ?? false,
  });

  revalidatePath("/subscriptions");
  revalidatePath("/stats");
}
