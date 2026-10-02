import { sql } from "drizzle-orm";
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
//
// A brand-new user's first page load fans out into several concurrent
// server renders (layout + parallel Suspense sections + prefetches), each of
// which can see "zero categories" at once — a plain insert then seeded the
// whole set twice for a real user. So: one transaction that first takes a
// per-user advisory lock (released at commit) and only inserts if the user
// still has no categories once it holds the lock. A second racer blocks on
// the lock, then sees the first one's committed rows and inserts nothing.
export async function seedDefaultCategories(userId: string) {
  const values = defaultCategories.map((c, index) => ({
    userId,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    sortOrder: index,
  }));
  await db.batch([
    db.execute(sql`select pg_advisory_xact_lock(hashtext(${`seed-categories:${userId}`}))`),
    db.execute(sql`
      insert into ${categories} (user_id, name, type, icon, color, sort_order)
      select v.user_id, v.name, v.type::category_type, v.icon, v.color, v.sort_order
      from json_to_recordset(${JSON.stringify(
        values.map((v) => ({ user_id: v.userId, name: v.name, type: v.type, icon: v.icon, color: v.color, sort_order: v.sortOrder })),
      )}::json) as v(user_id text, name text, type text, icon text, color text, sort_order int)
      where not exists (select 1 from ${categories} where user_id = ${userId})
    `),
  ]);
}
