"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ownedCategoryId } from "@/lib/category";
import { currentBudgetMonth, ensureMonthBudgets } from "@/lib/budgets";
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
  const month = currentBudgetMonth();
  // Carry last month's budgets over first: adding one budget on the 1st
  // before anything else ran would otherwise leave the month with just
  // that one, and the rest would never be copied.
  await ensureMonthBudgets(userId, month);

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

  const [deleted] = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning({ month: budgets.month });

  // Deleted the month's last budget: leave a cleared marker (limit 0, see
  // lib/budgets.ts) so the month isn't refilled from last month on the
  // next page load.
  if (deleted) {
    const [remaining] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, deleted.month)))
      .limit(1);
    if (!remaining) {
      await db
        .insert(budgets)
        .values({ userId, categoryId: null, month: deleted.month, limitAmount: "0" })
        .onConflictDoNothing();
    }
  }

  revalidateBudgetPaths();
}
