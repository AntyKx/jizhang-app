import { format } from "date-fns";
import { and, eq, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories, recurringRules } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";
import { DueSubscriptionsCard } from "@/components/record/due-subscriptions-card";
import { Reveal } from "@/components/motion/reveal";

// Independent Suspense island on /record — kept separate from
// HomeSummarySection so a slow Clerk API call there never holds up this
// (usually fast, single-table) query, and vice versa.
export async function DueSubscriptionsSection({ userId }: { userId: string }) {
  const today = format(getTodayInTaipei(), "yyyy-MM-dd");

  const dueRuleRows = await db
    .select({
      id: recurringRules.id,
      name: recurringRules.name,
      amount: recurringRules.amount,
      type: recurringRules.type,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      nextOccurrence: recurringRules.nextOccurrence,
    })
    .from(recurringRules)
    .leftJoin(categories, eq(recurringRules.categoryId, categories.id))
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.isActive, true),
        ne(recurringRules.type, "transfer"),
        lte(recurringRules.nextOccurrence, today),
      ),
    )
    .orderBy(recurringRules.nextOccurrence);

  // The query already excludes "transfer" rules — narrow the type here
  // since drizzle can't reflect a runtime `where` filter in its inferred
  // column type.
  const dueRules = dueRuleRows.map((r) => ({ ...r, type: r.type as "income" | "expense" }));

  // Returning null with no wrapper at all (rather than a Reveal that still
  // renders an empty div around a null child) keeps this section from
  // taking up a flex gap on the home page when nothing's due.
  if (dueRules.length === 0) return null;

  return (
    <Reveal>
      <DueSubscriptionsCard rules={dueRules} />
    </Reveal>
  );
}
