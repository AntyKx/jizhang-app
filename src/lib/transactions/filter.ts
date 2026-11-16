import { and, desc, eq, gte, ilike, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { transactions } from "@/db/schema";
import type { TransactionsCursor, TransactionsFilter } from "@/lib/transactions/list-types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// createdAt as the client sees it. Postgres keeps microseconds but a JS Date
// (what the cursor carries back) only has milliseconds, so the sort and the
// cursor comparison both run on the truncated value — comparing the raw
// column against a truncated cursor would skip rows created within the same
// millisecond as the last row of a page.
const createdAtMs = sql`date_trunc('milliseconds', ${transactions.createdAt})`;

// Newest first; `id` is the last tiebreaker (see TransactionsCursor).
export const transactionsListOrder = [desc(transactions.occurredAt), desc(createdAtMs), desc(transactions.id)];

// Keyset predicate: every row strictly after `cursor` in transactionsListOrder.
export function beforeTransactionsCursor(cursor: TransactionsCursor | null): SQL | undefined {
  if (!cursor) return undefined;
  const createdAt = sql`${new Date(cursor.createdAt).toISOString()}::timestamp`;
  return or(
    lt(transactions.occurredAt, cursor.occurredAt),
    and(eq(transactions.occurredAt, cursor.occurredAt), sql`${createdAtMs} < ${createdAt}`),
    and(
      eq(transactions.occurredAt, cursor.occurredAt),
      sql`${createdAtMs} = ${createdAt}`,
      lt(transactions.id, cursor.id),
    ),
  );
}

// Shared by /transactions's initial page query and loadMoreTransactions'
// pagination query — kept in one place so "load more" can't silently drift
// from what the first page filtered on. `type` isn't a condition here: the
// two callers each run a regular-row stream and a transfer-row stream, and
// honour it by choosing which streams to run (see listStreamsFor).
export function transactionsFilterConditions(filter?: TransactionsFilter): SQL[] {
  const conditions: SQL[] = [];
  if (filter?.categoryId !== undefined) {
    conditions.push(
      filter.categoryId === null ? isNull(transactions.categoryId) : eq(transactions.categoryId, filter.categoryId),
    );
  }
  // These arrive from the client (loadMoreTransactions is a server action),
  // so anything that isn't a well-formed value is dropped rather than handed
  // to Postgres to choke on.
  if (filter?.start && DATE_RE.test(filter.start)) conditions.push(gte(transactions.occurredAt, filter.start));
  if (filter?.end && DATE_RE.test(filter.end)) conditions.push(lte(transactions.occurredAt, filter.end));
  if (filter?.accountId && UUID_RE.test(filter.accountId)) {
    // Either side of a transfer counts as "this account's" row.
    conditions.push(
      or(eq(transactions.accountId, filter.accountId), eq(transactions.toAccountId, filter.accountId))!,
    );
  }
  if (filter?.type === "expense" || filter?.type === "income") {
    conditions.push(eq(transactions.type, filter.type));
  }
  const search = filter?.search?.trim().slice(0, 50);
  if (search) {
    // Escape LIKE wildcards so a typed "%" or "_" matches literally.
    const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    // A plain number also matches that exact amount ("120" finds the NT$120
    // lunch); abs() so a refund booked as a negative expense is found too.
    const amountText = search.replace(/,/g, "");
    const amountMatch = /^\d{1,12}(\.\d{1,2})?$/.test(amountText)
      ? sql`abs(${transactions.amount}) = ${amountText}::numeric`
      : undefined;
    // Same fields the box always searched (商家、備註、分類、帳戶) — category and
    // account names via EXISTS so this works for both the regular-row query
    // (which joins categories) and the transfer query (which doesn't).
    conditions.push(
      or(
        ilike(transactions.merchant, pattern),
        ilike(transactions.note, pattern),
        sql`exists (select 1 from categories c where c.id = ${transactions.categoryId} and c.name ilike ${pattern})`,
        sql`exists (select 1 from accounts a where a.id in (${transactions.accountId}, ${transactions.toAccountId}) and a.name ilike ${pattern})`,
        amountMatch,
      )!,
    );
  }
  return conditions;
}

// Which of the two row streams a filter can match at all. A category filter
// never matches a transfer (transfers have no category), and a type filter
// names exactly one stream — skipping the other avoids querying for rows
// that can't come back.
export function listStreamsFor(filter?: TransactionsFilter): { regular: boolean; transfers: boolean } {
  if (filter?.type === "transfer") return { regular: false, transfers: true };
  if (filter?.type === "expense" || filter?.type === "income") return { regular: true, transfers: false };
  return { regular: true, transfers: filter?.categoryId === undefined };
}
