import { db } from "./index";
import { categories } from "./schema";
import { defaultCategories } from "../lib/default-categories";
import { and, eq, isNull } from "drizzle-orm";

async function main() {
  const existing = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(isNull(categories.userId));

  const existingByName = new Map(existing.map((c) => [c.name, c.id]));
  const toInsert = defaultCategories.filter((c) => !existingByName.has(c.name));

  for (const [index, c] of defaultCategories.entries()) {
    const existingId = existingByName.get(c.name);
    if (!existingId) continue;
    await db
      .update(categories)
      .set({ icon: c.icon, color: c.color, sortOrder: index })
      .where(and(eq(categories.id, existingId), isNull(categories.userId)));
  }

  if (toInsert.length > 0) {
    await db.insert(categories).values(
      toInsert.map((c) => ({
        userId: null,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        sortOrder: defaultCategories.findIndex((d) => d.name === c.name),
      })),
    );
  }

  console.log(
    `Seeded ${toInsert.length} new categories, updated ${defaultCategories.length - toInsert.length} existing.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
