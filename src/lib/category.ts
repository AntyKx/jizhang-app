import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

/**
 * Narrows a client-supplied categoryId to one this user actually owns.
 *
 * A categoryId arriving from a form/action payload can name any row in the
 * table, including another user's — every write path that accepts one runs
 * it through here first. Downgrades to null ("uncategorized") rather than
 * failing: a stale or foreign id isn't worth blocking the user's own entry
 * over, and null is exactly what uncategorized already means everywhere
 * else in the app.
 */
export async function ownedCategoryId(
  userId: string,
  categoryId: string | null | undefined,
): Promise<string | null> {
  if (!categoryId) return null;
  const [owned] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  return owned?.id ?? null;
}
