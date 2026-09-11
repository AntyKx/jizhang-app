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
  unique,
  jsonb,
  type AnyPgColumn,
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

// Which storefront an entitlement was granted through — drives the
// /upgrade page's "manage subscription" link (Stripe billing portal vs. a
// deep link to the OS's own subscription settings) and is otherwise just
// support/debugging context. Null means legacy/Stripe: every row predating
// this column has a real stripeCustomerId to build a billing-portal
// session from, so null and "stripe" are treated the same everywhere.
export const purchasePlatformEnum = pgEnum("purchase_platform", ["stripe", "app_store", "play_store"]);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(), // Clerk user id
  // Preselected in CreateAccountDialog's currency picker so a user who
  // mostly opens foreign-currency accounts doesn't have to reselect it
  // every time — otherwise unrelated to net-worth math, which always
  // converts to TWD regardless of this value.
  baseCurrency: text("base_currency").notNull().default("TWD"),
  monthStartDay: integer("month_start_day").notNull().default(1),
  // Preferred account for quick-add's initial selection — nullable, and
  // `() => accounts.id` defers resolution past this table's own
  // declaration since `accounts` is defined further down this file.
  // set null on delete so removing the account just falls back to
  // getDefaultAccountId's oldest-account behavior instead of erroring.
  defaultAccountId: uuid("default_account_id").references(() => accounts.id, { onDelete: "set null" }),
  // One-time purchase that permanently unlocks multi-account, advanced
  // stats, data export, and the shared ledger (see entitlements.ts).
  hasPurchasedCore: boolean("has_purchased_core").notNull().default(false),
  corePurchasedAt: timestamp("core_purchased_at"),
  // Which storefront granted it — Stripe webhook and the RevenueCat
  // webhook both write this alongside hasPurchasedCore/aiSubscriptionStatus.
  corePurchasePlatform: purchasePlatformEnum("core_purchase_platform"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  aiSubscriptionStatus: aiSubscriptionStatusEnum("ai_subscription_status").notNull().default("none"),
  aiSubscriptionCurrentPeriodEnd: timestamp("ai_subscription_current_period_end"),
  aiSubscriptionPlatform: purchasePlatformEnum("ai_subscription_platform"),
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
  // Set only on a settlement transaction produced by settleParticipant
  // (never by the old cross-event net-settle path) — reverse pointer of
  // sharedExpenses.linkedTransactionId. Lets transaction lists collapse
  // every settlement of one split event into one display group without
  // merging the underlying rows; each settlement still needs independent
  // traceability. set null (not cascade) since deleteSplitExpense already
  // refuses once any participant is settled — this is just a safe degrade
  // if that invariant is ever broken outside the app.
  linkedSharedExpenseId: uuid("linked_shared_expense_id").references(
    (): AnyPgColumn => sharedExpenses.id,
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
  // One budget per category per month (and one overall budget, where
  // categoryId is null — hence NULLS NOT DISTINCT, since Postgres would
  // otherwise treat every null as unique and let overall budgets pile up).
  // Without this, re-submitting the create dialog silently produced a
  // second row for the same category, which then double-counted in the
  // budget totals on /budgets and /stats.
  unique("budgets_user_category_month_key")
    .on(table.userId, table.categoryId, table.month)
    .nullsNotDistinct(),
]);

// One counterparty's share of a split expense. Lives inside
// sharedExpenses.participants (a jsonb array) rather than as its own row —
// keeps "one real transaction can be split N ways" from exploding the
// transactions↔sharedExpenses join into N joined rows (it stays a plain 1:1
// leftJoin on linkedTransactionId, same as before this table supported more
// than one counterparty per item). Settling one participant just rewrites
// their element in place; the settlement transaction it produces still goes
// into the real transactions table like any other reimbursement.
export type SplitParticipant = {
  name: string;
  amount: string;
  // true = I owe this person their `amount`; false = they owe me. Kept per
  // participant (not on the row) so a single ad-hoc split can't accidentally
  // mix directions, but the data model doesn't forbid it either.
  iOwe: boolean;
  isSettled: boolean;
  settledAt: string | null;
  // The reimbursement transaction settleParticipant/settleAllForName
  // produced when this participant was marked settled — lets
  // unsettleParticipant find and delete exactly that transaction (reversing
  // its balance effect) when reverting a mistaken settlement.
  settlementTransactionId: string | null;
  // Shared by every participant settled together in one settleAllForName
  // call — they all point at the same settlementTransactionId (one net
  // transaction for the whole batch), so reverting any one of them has to
  // revert the whole batch at once, not just that participant.
  settlementBatchId: string | null;
};

export const sharedExpenses = pgTable("shared_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  note: text("note"),
  occurredAt: date("occurred_at").notNull(),
  // Set only when this row was auto-created from the "分帳" section on a
  // personal transaction. Cascades so deleting the source transaction
  // removes the split-ledger copy too, instead of leaving an orphaned row
  // behind.
  linkedTransactionId: uuid("linked_transaction_id").references(() => transactions.id, {
    onDelete: "cascade",
  }),
  participants: jsonb("participants").notNull().$type<SplitParticipant[]>(),
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
