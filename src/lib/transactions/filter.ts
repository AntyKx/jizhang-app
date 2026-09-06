import { eq, gte, isNull, lte, type SQL } from "drizzle-orm";
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
  return conditions;
}
