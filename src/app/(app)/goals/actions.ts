"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

const createGoalSchema = z.object({
  name: z.string().min(1).max(50),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.string().optional(),
});

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();
  const targetDateRaw = formData.get("targetDate");
  const parsed = createGoalSchema.parse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: targetDateRaw ? String(targetDateRaw) : undefined,
  });

  await db.insert(savingsGoals).values({
    userId,
    name: parsed.name,
    targetAmount: parsed.targetAmount.toString(),
    targetDate: parsed.targetDate,
  });

  revalidatePath("/goals");
  revalidatePath("/stats");
}

export async function contributeToGoal(goalId: string, amount: number) {
  const userId = await requireUserId();
  if (amount <= 0) return;

  const [goal] = await db
    .update(savingsGoals)
    .set({ currentAmount: sql`${savingsGoals.currentAmount} + ${amount}` })
    .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)))
    .returning();

  if (goal && Number(goal.currentAmount) >= Number(goal.targetAmount)) {
    await db
      .update(savingsGoals)
      .set({ isCompleted: true })
      .where(eq(savingsGoals.id, goalId));
  }

  revalidatePath("/goals");
  revalidatePath("/stats");
}
