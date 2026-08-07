"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

function revalidateGoalPaths() {
  revalidatePath("/goals");
  revalidatePath("/stats");
}

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

  revalidateGoalPaths();
}

const updateGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.string().nullable(),
});

export async function updateGoal(input: {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
}) {
  const userId = await requireUserId();
  const parsed = updateGoalSchema.parse(input);

  const [goal] = await db
    .select({ currentAmount: savingsGoals.currentAmount })
    .from(savingsGoals)
    .where(and(eq(savingsGoals.id, parsed.id), eq(savingsGoals.userId, userId)));
  if (!goal) throw new Error("找不到指定的目標");

  await db
    .update(savingsGoals)
    .set({
      name: parsed.name,
      targetAmount: parsed.targetAmount.toString(),
      targetDate: parsed.targetDate,
      isCompleted: Number(goal.currentAmount) >= parsed.targetAmount,
    })
    .where(and(eq(savingsGoals.id, parsed.id), eq(savingsGoals.userId, userId)));

  revalidateGoalPaths();
}

export async function deleteGoal(id: string) {
  const userId = await requireUserId();

  await db.delete(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));

  revalidateGoalPaths();
}

export async function contributeToGoal(goalId: string, amount: number) {
  const userId = await requireUserId();
  if (amount <= 0) return;

  await db
    .update(savingsGoals)
    .set({
      currentAmount: sql`${savingsGoals.currentAmount} + ${amount}`,
      isCompleted: sql`(${savingsGoals.currentAmount} + ${amount}) >= ${savingsGoals.targetAmount}`,
    })
    .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)));

  revalidateGoalPaths();
}
