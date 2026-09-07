import { type AccountType } from "@/lib/account-type";

export const TRANSACTIONS_PAGE_SIZE = 50;

export type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };
export type Account = { id: string; name: string; type: AccountType };
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
  paidByMe: boolean;
};

export type TransferListItem = {
  kind: "transfer";
  id: string;
  amount: string;
  feeAmount: string;
  note: string | null;
  occurredAt: string;
  fromAccountId: string;
  toAccountId: string | null;
};

export type ListItem = RegularItem | TransferListItem;

// `createdAt` is the tiebreaker for the (occurredAt, createdAt) sort/cursor
// used to page through the timeline — kept off the public ListItem type
// since the UI never displays it, but carried alongside for pagination.
export type ListItemRow = ListItem & { createdAt: Date };

export type TransactionsCursor = { occurredAt: string; createdAt: Date };

// Optional narrowing for the /transactions page reached by tapping a
// category on /stats — `categoryId: null` means "uncategorized" (a real,
// selectable state), so it's kept distinct from "no filter" (the field
// simply absent).
export type TransactionsFilter = { categoryId?: string | null; start?: string; end?: string };
