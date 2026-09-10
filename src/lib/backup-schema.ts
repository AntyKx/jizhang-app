import { z } from "zod";

// Shape of the downloadable backup JSON (see /api/export/backup) and what
// restoreBackup() validates an uploaded file against. Deliberately excludes
// `userId` on every row — restore always injects the *current* user's id
// fresh for every insert rather than trusting whatever is in the file, and
// excludes every billing/entitlement field on `settings` — those must only
// ever come from Stripe (via the webhook), never from a backup file, or a
// restore could accidentally grant or revoke a purchase that has nothing to
// do with what's actually on the user's Stripe account.
export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(["income", "expense"]),
      icon: z.string().nullable(),
      color: z.string().nullable(),
      sortOrder: z.number().int(),
    }),
  ),
  accounts: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(["cash", "bank", "credit_card", "e_wallet", "investment"]),
      currency: z.string(),
      initialBalance: z.string(),
      initialExchangeRate: z.string(),
      currentBalance: z.string(),
      color: z.string().nullable(),
      icon: z.string().nullable(),
      isArchived: z.boolean(),
      excludeFromNetWorth: z.boolean(),
      // Optional so a backup downloaded before this field existed still
      // restores — same rule for every field added from here on.
      statementDay: z.number().int().nullable().optional(),
      sortOrder: z.number().int(),
    }),
  ),
  recurringRules: z.array(
    z.object({
      id: z.string().uuid(),
      accountId: z.string().uuid(),
      categoryId: z.string().uuid().nullable(),
      name: z.string(),
      amount: z.string(),
      type: z.enum(["income", "expense", "transfer"]),
      paymentMethod: z.enum(["cash", "credit_card", "debit_card", "mobile_payment", "auto_debit", "other"]),
      frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
      interval: z.number().int(),
      nextOccurrence: z.string(),
      endDate: z.string().nullable(),
      isSubscription: z.boolean(),
      isActive: z.boolean(),
    }),
  ),
  transactions: z.array(
    z.object({
      id: z.string().uuid(),
      accountId: z.string().uuid(),
      toAccountId: z.string().uuid().nullable(),
      categoryId: z.string().uuid().nullable(),
      type: z.enum(["income", "expense", "transfer"]),
      amount: z.string(),
      exchangeRate: z.string(),
      feeAmount: z.string(),
      paymentMethod: z.enum(["cash", "credit_card", "debit_card", "mobile_payment", "auto_debit", "other"]),
      note: z.string().nullable(),
      merchant: z.string().nullable(),
      occurredAt: z.string(),
      recurringRuleId: z.string().uuid().nullable(),
    }),
  ),
  budgets: z.array(
    z.object({
      id: z.string().uuid(),
      categoryId: z.string().uuid().nullable(),
      month: z.string(),
      limitAmount: z.string(),
    }),
  ),
  savingsGoals: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      targetAmount: z.string(),
      currentAmount: z.string(),
      targetDate: z.string().nullable(),
      icon: z.string().nullable(),
      color: z.string().nullable(),
      isCompleted: z.boolean(),
    }),
  ),
  sharedExpenses: z.array(
    z.object({
      id: z.string().uuid(),
      categoryId: z.string().uuid().nullable(),
      name: z.string(),
      note: z.string().nullable(),
      occurredAt: z.string(),
      linkedTransactionId: z.string().uuid().nullable(),
      participants: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
          iOwe: z.boolean(),
          isSettled: z.boolean(),
          settledAt: z.string().nullable(),
          settlementTransactionId: z.string().uuid().nullable(),
          settlementBatchId: z.string().uuid().nullable(),
        }),
      ),
    }),
  ),
  settings: z
    .object({
      baseCurrency: z.string(),
      monthStartDay: z.number().int(),
      defaultAccountId: z.string().uuid().nullable().optional(),
    })
    .nullable(),
});

export type Backup = z.infer<typeof backupSchema>;
