import { type AccountType } from "@/lib/account-type";

export const TRANSACTIONS_PAGE_SIZE = 50;

export type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };
export type Account = { id: string; name: string; type: AccountType; currency: string };
export type AccountInfo = { name: string; type: AccountType };

export type RegularItem = {
  kind: "transaction";
  id: string;
  type: "income" | "expense";
  amount: string;
  note: string | null;
  merchant: string | null;
  occurredAt: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  paymentMethod: string;
  accountId: string;
  isSharedExpense: boolean;
  splitParticipants: { name: string; amount: string }[];
  splitLocked: boolean;
  // Set only when this transaction is a split-settlement reimbursement —
  // lets the list collapse consecutive settlements of the same split event
  // into one group (see group-settlements.ts). Never set by any user-facing
  // form.
  linkedSharedExpenseId: string | null;
  settlementGroupLabel: string | null;
};

export type TransferListItem = {
  kind: "transfer";
  // "adjustment" is a 餘額校正 riding the same one-account-row pipeline:
  // signed `amount`, no destination, rendered as its own row style.
  type: "transfer" | "adjustment";
  id: string;
  amount: string;
  feeAmount: string;
  note: string | null;
  occurredAt: string;
  fromAccountId: string;
  toAccountId: string | null;
  // A transfer can never be a split-settlement reimbursement — always null,
  // never read from the DB. Declared (not omitted) so groupSettlements'
  // ListItem-typed callers satisfy its generic constraint without a
  // TypeScript "weak type" rejection (an all-optional constraint accepts
  // literally any unrelated object, which TS specifically disallows).
  linkedSharedExpenseId: null;
  settlementGroupLabel: null;
};

export type ListItem = RegularItem | TransferListItem;

// `createdAt` is the tiebreaker for the (occurredAt, createdAt) sort/cursor
// used to page through the timeline — kept off the public ListItem type
// since the UI never displays it, but carried alongside for pagination.
export type ListItemRow = ListItem & { createdAt: Date };

// `id` breaks ties between rows sharing one (occurredAt, createdAt) — every
// row a restore inserted in one statement, or a batch settlement, has the
// same createdAt, and without a third key "load more" skipped whichever of
// them fell after a page boundary.
export type TransactionsCursor = { occurredAt: string; createdAt: Date; id: string };

// Optional narrowing for the /transactions page reached by tapping a
// category on /stats — `categoryId: null` means "uncategorized" (a real,
// selectable state), so it's kept distinct from "no filter" (the field
// simply absent).
// `search` is the list's search box — matched server-side so it reaches
// rows that haven't been paged in yet (see transactionsFilterConditions).
// `accountId` narrows to one account (either side of a transfer) — an
// account's own detail list, and /transactions' account filter. `type`
// narrows to one kind of row ("transfer" also covers 餘額校正, which rides
// the same list stream).
export type TransactionsTypeFilter = "expense" | "income" | "transfer";
export type TransactionsFilter = {
  categoryId?: string | null;
  start?: string;
  end?: string;
  search?: string;
  accountId?: string;
  type?: TransactionsTypeFilter;
};

// The (occurredAt, createdAt, id) ordering every paged transaction list
// sorts by — shared so the server's first page, "load more", and the merge
// of the two row streams can't drift apart.
export function compareListRows(
  a: { occurredAt: string; createdAt: Date; id: string },
  b: { occurredAt: string; createdAt: Date; id: string },
): number {
  if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? 1 : -1;
  const at = a.createdAt.getTime();
  const bt = b.createdAt.getTime();
  if (at !== bt) return at < bt ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

// Narrows a raw transactions.type (the enum) to TransferListItem's fields —
// for rows fetched by the transfer/adjustment list queries.
export function transferKind(type: string): { kind: "transfer"; type: "transfer" | "adjustment" } {
  return { kind: "transfer", type: type === "adjustment" ? "adjustment" : "transfer" };
}
