"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { pickCategoryColor } from "@/lib/category-color";
import { iconOptions } from "@/lib/icon-options";
import { bearIcons } from "@/lib/bear-icons";

const dataImagePattern = /^data:image\/(png|jpeg|jpg|webp);base64,/;
const bearIconPaths = new Set(bearIcons.map((b) => b.path));

const iconSchema = z
  .string()
  .max(10_000_000)
  .refine((v) => iconOptions.includes(v) || bearIconPaths.has(v) || dataImagePattern.test(v));

const createCategorySchema = z.object({
  name: z.string().min(1).max(20),
  type: z.enum(["income", "expense"]),
  icon: iconSchema,
});

function revalidateCategoryPaths() {
  revalidatePath("/categories");
  revalidatePath("/record");
  revalidatePath("/stats");
  revalidatePath("/budgets");
  revalidatePath("/subscriptions");
}

export async function createCategory(input: {
  name: string;
  type: "income" | "expense";
  icon: string;
}) {
  const userId = await requireUserId();
  const parsed = createCategorySchema.parse(input);

  await db.insert(categories).values({
    userId,
    name: parsed.name,
    type: parsed.type,
    icon: parsed.icon,
    color: pickCategoryColor(parsed.name),
  });

  revalidateCategoryPaths();
}

const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(20),
  icon: iconSchema,
});

export async function updateCategory(input: { id: string; name: string; icon: string }) {
  const userId = await requireUserId();
  const parsed = updateCategorySchema.parse(input);

  await db
    .update(categories)
    .set({ name: parsed.name, icon: parsed.icon, color: pickCategoryColor(parsed.name) })
    .where(
      and(
        eq(categories.id, parsed.id),
        or(isNull(categories.userId), eq(categories.userId, userId)),
      ),
    );

  revalidateCategoryPaths();
}

export async function deleteCategory(id: string) {
  const userId = await requireUserId();

  await db
    .delete(categories)
    .where(
      and(eq(categories.id, id), or(isNull(categories.userId), eq(categories.userId, userId))),
    );

  revalidateCategoryPaths();
}

const reorderSchema = z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() }));

export async function reorderCategories(updates: { id: string; sortOrder: number }[]) {
  const userId = await requireUserId();
  const parsed = reorderSchema.parse(updates);

  await Promise.all(
    parsed.map((u) =>
      db
        .update(categories)
        .set({ sortOrder: u.sortOrder })
        .where(
          and(
            eq(categories.id, u.id),
            or(isNull(categories.userId), eq(categories.userId, userId)),
          ),
        ),
    ),
  );

  revalidatePath("/categories");
  revalidatePath("/record");
}
