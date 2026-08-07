import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";

// "AI 越用越懂你" — instead of asking the LLM to re-guess a category every
// single time, check whether this user has already categorized transactions
// from the same merchant before and prefer that over a fresh guess. This is
// a plain DB lookup (no extra AI call, so it's free), and it's more
// trustworthy than the LLM's guess anyway — it reflects how *this* user
// actually classifies that merchant, not a generic assumption (e.g. some
// people put Uber under 交通, others under 娛樂).
//
// Matches on exact (case-insensitive) merchant name — deliberately not
// fuzzy, to avoid confidently suggesting the wrong category for a
// similarly-named but different merchant. A user typing/AI-parsing the
// merchant name slightly differently each time won't get picked up; that's
// a known limitation, not a bug — safer to under-match than over-match here.
export async function suggestCategoryForMerchant(
  userId: string,
  merchant: string | null | undefined,
  type: "income" | "expense",
): Promise<string | null> {
  const trimmed = merchant?.trim();
  if (!trimmed) return null;

  const [top] = await db
    .select({ name: categories.name, count: sql<number>`count(*)::int` })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, type),
        ilike(transactions.merchant, trimmed),
      ),
    )
    .groupBy(categories.name)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  return top?.name ?? null;
}
