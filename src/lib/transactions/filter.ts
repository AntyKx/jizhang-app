import { eq, gte, ilike, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { transactions } from "@/db/schema";
import type { TransactionsFilter } from "@/lib/transactions/list-types";

// Shared by /transactions's initial page query and loadMoreTransactions'
// pagination query — kept in one place so "load more" can't silently drift
// from what the first page filtered on.
export function transactionsFilterConditions(filter?: TransactionsFilter): SQL[] {
  const conditions: SQL[] = [];
  if (filter?.categoryId !== undefined) {
    conditions.push(
      filter.categoryId === null ? isNull(transactions.categoryId) : eq(transactions.categoryId, filter.categoryId),
    );
  }
  if (filter?.start) conditions.push(gte(transactions.occurredAt, filter.start));
  if (filter?.end) conditions.push(lte(transactions.occurredAt, filter.end));
  const search = filter?.search?.trim().slice(0, 50);
  if (search) {
    // Escape LIKE wildcards so a typed "%" or "_" matches literally.
    const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    // Same fields the box always searched (商家、備註、分類、帳戶) — category and
    // account names via EXISTS so this works for both the regular-row query
    // (which joins categories) and the transfer query (which doesn't).
    conditions.push(
      or(
        ilike(transactions.merchant, pattern),
        ilike(transactions.note, pattern),
        sql`exists (select 1 from categories c where c.id = ${transactions.categoryId} and c.name ilike ${pattern})`,
        sql`exists (select 1 from accounts a where a.id in (${transactions.accountId}, ${transactions.toAccountId}) and a.name ilike ${pattern})`,
      )!,
    );
  }
  return conditions;
}
