import { db } from "@/db";
import { categories } from "@/db/schema";

// A small starter set seeded into a brand-new user's own account (see
// seedDefaultCategories below) — not a locked/shared set everyone gets
// forced into. The user is expected to add whatever else they need
// themselves via "新增分類"; this just avoids handing them a completely
// empty grid on day one. Same curated warm/muted color family as
// category-color.ts's fallback palette (consistent saturation/lightness,
// only hue varies).
export const defaultCategories: {
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}[] = [
  { name: "餐飲", type: "expense", icon: "utensils", color: "#C0512A" },
  { name: "交通", type: "expense", icon: "car", color: "#B8721A" },
  { name: "購物", type: "expense", icon: "shopping-bag", color: "#7A5B96" },
  { name: "居家", type: "expense", icon: "house", color: "#4B7A5E" },
  { name: "薪資", type: "income", icon: "banknote", color: "#3F7A52" },
  { name: "其他收入", type: "income", icon: "plus-circle", color: "#8A7256" },
];

// Called lazily the first time a user is found to have zero categories
// (see lib/quick-add-context.ts) — same "create on first need" pattern as
// lib/account.ts's getDefaultAccountId for a brand-new user's first
// account. These rows are the user's own from the moment they're created:
// fully editable, deletable, and reorderable, unlike the old shared
// (userId IS NULL) rows this replaced.
export async function seedDefaultCategories(userId: string) {
  await db.insert(categories).values(
    defaultCategories.map((c, index) => ({
      userId,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      sortOrder: index,
    })),
  );
}
