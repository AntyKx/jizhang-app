"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { format, startOfMonth } from "date-fns";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

const createBudgetSchema = z.object({
  categoryId: z.string().uuid().optional(),
  limitAmount: z.coerce.number().positive(),
});

export async function createBudget(formData: FormData) {
  const userId = await requireUserId();
  const categoryIdRaw = formData.get("categoryId");
  const parsed = createBudgetSchema.parse({
    categoryId: categoryIdRaw && categoryIdRaw !== "overall" ? categoryIdRaw : undefined,
    limitAmount: formData.get("limitAmount"),
  });

  await db.insert(budgets).values({
    userId,
    categoryId: parsed.categoryId,
    month: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    limitAmount: parsed.limitAmount.toString(),
  });

  revalidatePath("/budgets");
  revalidatePath("/stats");
}
