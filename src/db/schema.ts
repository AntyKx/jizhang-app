import {
  pgTable,
  text,
  uuid,
  numeric,
  timestamp,
  boolean,
  integer,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "credit_card",
  "e_wallet",
  "investment",
]);

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);

export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "credit_card",
  "debit_card",
  "mobile_payment",
  "auto_debit",
  "other",
]);

export const aiSubscriptionStatusEnum = pgEnum("ai_subscription_status", [
  "none",
  "active",
  "past_due",
  "canceled",
]);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(), // Clerk user id
  baseCurrency: text("base_currency").notNull().default("TWD"),
  monthStartDay: integer("month_start_day").notNull().default(1),
  // Display name for the other half of a single-user "分帳本" — a nominal
  // counterparty, not a real second account (see sharedExpenses).
  partnerName: text("partner_name"),
  // One-time purchase that permanently unlocks multi-account, advanced
  // stats, data export, and the shared ledger (see entitlements.ts).
  hasPurchasedCore: boolean("has_purchased_core").notNull().default(false),
  corePurchasedAt: timestamp("core_purchased_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  aiSubscriptionStatus: aiSubscriptionStatusEnum("ai_subscription_status").notNull().default("none"),
  aiSubscriptionCurrentPeriodEnd: timestamp("ai_subscription_current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull().default("cash"),
  currency: text("currency").notNull().default("TWD"),
  initialBalance: numeric("initial_balance", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  // Exchange rate (this currency -> base currency TWD) captured when the
  // account was created — lets net-worth math convert `initialBalance` into
  // TWD terms without needing a second live lookup at read time.
  initialExchangeRate: numeric("initial_exchange_rate", { precision: 14, scale: 6 })
    .notNull()
    .default("1"),
  currentBalance: numeric("current_balance", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  color: text("color").default("#6366f1"),
  icon: text("icon").default("wallet"),
  isArchived: boolean("is_archived").notNull().default(false),
  // For accounts you don't want counted in net worth or offered as a
  // destination when recording a normal income/expense — e.g. a fixed-
  // deposit (定存) account you only ever move money into/out of via
  // transfer, never spend from directly. Still a real account: still shows
  // up in account management and the transfer dialog.
  excludeFromNetWorth: boolean("exclude_from_net_worth").notNull().default(false),
  // Day of month (1-31) a credit card's statement closes — only ever set
  // when type is "credit_card"; null for every other account type, and
  // forced back to null if an account's type is ever changed away from
  // credit_card (see updateAccount).
  statementDay: integer("statement_day"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("accounts_user_idx").on(table.userId),
]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Always owned by exactly one user — there used to be a shared
  // userId-IS-NULL "system default" row visible to (and un-editable by)
  // everyone, but that meant one user's edit/delete/reorder would've
  // silently affected every other user's copy too. New users get a starter
  // set seeded into their own account instead (see
  // lib/default-categories.ts's seedDefaultCategories).
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: categoryTypeEnum("type").notNull(),
  icon: text("icon").default("tag"),
  color: text("color").default("#6366f1"),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("categories_user_idx").on(table.userId),
]);

export const recurringRules = pgTable("recurring_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull().default("expense"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  frequency: recurrenceFrequencyEnum("frequency").notNull().default("monthly"),
  interval: integer("interval").notNull().default(1),
  nextOccurrence: date("next_occurrence").notNull(),
  endDate: date("end_date"),
  isSubscription: boolean("is_subscription").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("recurring_rules_user_idx").on(table.userId),
  index("recurring_rules_user_next_occurrence_idx").on(table.userId, table.nextOccurrence),
]);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  toAccountId: uuid("to_account_id").references(() => accounts.id, {
    onDelete: "set null",
  }), // used for transfer type
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  // Exchange rate (account's currency -> base currency TWD), snapshotted at
  // creation using the historical rate for `occurredAt` — so editing the
  // amount/category later, or a rate moving afterward, never retroactively
  // changes what a past transaction contributed to cross-account totals.
  // Always "1" for TWD accounts.
  exchangeRate: numeric("exchange_rate", { precision: 14, scale: 6 }).notNull().default("1"),
  // Only meaningful for type="transfer" — a bank/ATM/exchange fee charged on
  // top of the transferred amount. Debited from the source account only;
  // the destination account only ever receives `amount`. In the account's
  // own currency, same as `amount` (not converted).
  feeAmount: numeric("fee_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  note: text("note"),
  merchant: text("merchant"),
  occurredAt: date("occurred_at").notNull(),
  recurringRuleId: uuid("recurring_rule_id").references(
    () => recurringRules.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("transactions_user_occurred_at_idx").on(table.userId, table.occurredAt),
  index("transactions_user_account_idx").on(table.userId, table.accountId),
  index("transactions_user_category_idx").on(table.userId, table.categoryId),
]);

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "cascade",
  }), // null = overall monthly budget
  month: date("month").notNull(), // stored as first day of month
  limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("budgets_user_month_idx").on(table.userId, table.month),
]);

export const sharedExpenses = pgTable("shared_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // owner of this single-user "分帳本"
  // No real second account — the counterparty is a nominal name
  // (userSettings.partnerName), so "who paid" is just a boolean.
  paidByMe: boolean("paid_by_me").notNull().default(true),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  occurredAt: date("occurred_at").notNull(),
  isSettled: boolean("is_settled").notNull().default(false),
  settledAt: timestamp("settled_at"),
  // Set only when this row was auto-created from the "分帳" checkbox on a
  // personal transaction. Cascades so deleting the source transaction
  // removes the shared-ledger copy too, instead of leaving an orphaned row
  // behind.
  linkedTransactionId: uuid("linked_transaction_id").references(() => transactions.id, {
    onDelete: "cascade",
  }),
  // The reimbursement transaction settleSharedExpense/settleAllSharedExpenses
  // produced when this item was marked settled — lets unsettleSharedExpense
  // find and delete exactly that transaction (reversing its balance effect)
  // when reverting a mistaken settlement. "set null" (not cascade) so
  // deleting the transaction some other way doesn't also silently delete
  // this shared-expense row — see the settlement-transaction guard in
  // transactions/actions.ts's deleteTransaction, which blocks that path.
  settlementTransactionId: uuid("settlement_transaction_id").references(() => transactions.id, {
    onDelete: "set null",
  }),
  // Shared by every item settled together in one settleAllSharedExpenses
  // call — they all point at the same settlementTransactionId (one net
  // transaction for the whole batch), so reverting any one of them has to
  // revert the whole batch at once, not just that row.
  settlementBatchId: uuid("settlement_batch_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("shared_expenses_user_idx").on(table.userId),
]);

export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  targetDate: date("target_date"),
  icon: text("icon").default("piggy-bank"),
  color: text("color").default("#22c55e"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("savings_goals_user_idx").on(table.userId),
]);

// One row per successful AI-assisted call (quick-add, receipt scan, shared
// quick-add) — powers both the monthly free-quota count and the abuse-guard
// rate limit in src/lib/entitlements.ts. Rows are never written for failed
// AI calls (see recordAiUsage).
export const aiUsageEvents = pgTable("ai_usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(), // "quick_add" | "receipt_scan" | "shared_quick_add"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("ai_usage_events_user_created_idx").on(table.userId, table.createdAt),
]);
