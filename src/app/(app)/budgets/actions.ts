"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { format, startOfMonth } from "date-fns";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ownedCategoryId } from "@/lib/category";
import { getTodayInTaipei } from "@/lib/date";
import { fail } from "@/lib/action-result";

function revalidateBudgetPaths() {
  revalidatePath("/budgets");
  revalidatePath("/stats");
}

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
  const categoryId = await ownedCategoryId(userId, parsed.categoryId);
  const month = format(startOfMonth(getTodayInTaipei()), "yyyy-MM-dd");

  // Upsert rather than insert — setting a budget for a category that
  // already has one this month means "change it to this", not "add a
  // second one" (which is what used to happen, then double-counted in
  // every total). Matches budgets_user_category_month_key in schema.ts.
  await db
    .insert(budgets)
    .values({ userId, categoryId, month, limitAmount: parsed.limitAmount.toString() })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.month],
      set: { limitAmount: parsed.limitAmount.toString() },
    });

  revalidateBudgetPaths();
}

export async function updateBudget(id: string, limitAmount: number) {
  const userId = await requireUserId();
  if (!(limitAmount > 0)) return fail("預算上限需大於 0");

  await db
    .update(budgets)
    .set({ limitAmount: limitAmount.toString() })
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

  revalidateBudgetPaths();
}

export async function deleteBudget(id: string) {
  const userId = await requireUserId();

  await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

  revalidateBudgetPaths();
}
