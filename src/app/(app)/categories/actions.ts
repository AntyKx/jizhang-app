"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { pickCategoryColor } from "@/lib/category-color";
import { bearIcons } from "@/lib/bear-icons";
import { categoryIconRegistry } from "@/lib/category-icons";

const dataImagePattern = /^data:image\/(png|jpeg|jpg|webp);base64,/;
// Bear paths stay accepted (not just the current Lucide slugs) so existing
// rows nobody has re-picked yet don't fail re-validation on unrelated edits.
const bearIconPaths = new Set(bearIcons.map((b) => b.path));
const lucideIconSlugs = new Set(Object.keys(categoryIconRegistry));

const iconSchema = z
  .string()
  .max(10_000_000)
  .refine((v) => lucideIconSlugs.has(v) || bearIconPaths.has(v) || dataImagePattern.test(v));

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

// System default categories (userId IS NULL) are shared/visible to every
// user, but must never be writable by one — otherwise any single user
// renaming, re-iconing, or deleting one would silently change or remove it
// for everyone else too. Only a user's own categories are ever matched here.
export async function updateCategory(input: { id: string; name: string; icon: string }) {
  const userId = await requireUserId();
  const parsed = updateCategorySchema.parse(input);

  const [updated] = await db
    .update(categories)
    .set({ name: parsed.name, icon: parsed.icon, color: pickCategoryColor(parsed.name) })
    .where(and(eq(categories.id, parsed.id), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  if (!updated) throw new Error("系統預設分類無法編輯，或找不到指定的分類");

  revalidateCategoryPaths();
}

export async function deleteCategory(id: string) {
  const userId = await requireUserId();

  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  if (!deleted) throw new Error("系統預設分類無法刪除，或找不到指定的分類");

  revalidateCategoryPaths();
}

const reorderSchema = z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() }));

// Reordering system categories is a no-op here (same ownership guard as
// above) — the drag grid mixes system + personal categories in one list, so
// a drag that includes system tiles just leaves their stored sortOrder
// untouched instead of silently rewriting shared rows.
export async function reorderCategories(updates: { id: string; sortOrder: number }[]) {
  const userId = await requireUserId();
  const parsed = reorderSchema.parse(updates);

  await Promise.all(
    parsed.map((u) =>
      db
        .update(categories)
        .set({ sortOrder: u.sortOrder })
        .where(and(eq(categories.id, u.id), eq(categories.userId, userId))),
    ),
  );

  revalidatePath("/categories");
  revalidatePath("/record");
}
