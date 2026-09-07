"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, recurringRules } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { getDefaultAccountId } from "@/lib/account";
import { advanceOccurrence } from "@/lib/recurrence";
import { createTransaction } from "@/app/(app)/transactions/actions";
import { fail, isFail, type Fail } from "@/lib/action-result";

// Shared ownership check for a user-supplied accountId — the create/edit
// dialogs now let the user pick which account a rule draws from, so a
// malicious/stale FormData value needs verifying against this user's own
// accounts before trusting it, same as createTransaction/updateTransaction
// already do for regular transactions.
async function requireOwnedAccountId(userId: string, accountId: string): Promise<string | Fail> {
  const [owned] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!owned) return fail("找不到指定的帳戶");
  return owned.id;
}

function revalidateSubscriptionPaths() {
  revalidatePath("/subscriptions");
  revalidatePath("/stats");
}

function revalidateOccurrencePaths() {
  revalidateSubscriptionPaths();
  revalidatePath("/record");
  revalidatePath("/calendar");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

// Advances `nextOccurrence` by one interval, and deactivates the rule if
// that pushes it past `endDate` — otherwise a finished rule would keep
// nagging forever with an occurrence date beyond when it was meant to stop.
async function advanceRule(userId: string, rule: typeof recurringRules.$inferSelect) {
  const nextOccurrence = advanceOccurrence(rule.nextOccurrence, rule.frequency, rule.interval);
  const isActive = rule.endDate ? nextOccurrence <= rule.endDate : true;

  await db
    .update(recurringRules)
    .set({ nextOccurrence, isActive })
    .where(and(eq(recurringRules.id, rule.id), eq(recurringRules.userId, userId)));
}

const paymentMethodSchema = z
  .enum(["cash", "credit_card", "debit_card", "mobile_payment", "auto_debit", "other"])
  .default("cash");

const createRuleSchema = z.object({
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  name: z.string().min(1).max(50),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  paymentMethod: paymentMethodSchema,
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.coerce.number().int().positive().default(1),
  nextOccurrence: z.string().min(1),
});

export async function createRecurringRule(formData: FormData) {
  const userId = await requireUserId();
  const categoryIdRaw = formData.get("categoryId");
  const accountIdRaw = formData.get("accountId");
  const parsed = createRuleSchema.parse({
    categoryId: categoryIdRaw ? String(categoryIdRaw) : undefined,
    accountId: accountIdRaw ? String(accountIdRaw) : undefined,
    name: formData.get("name"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    paymentMethod: formData.get("paymentMethod") || undefined,
    frequency: formData.get("frequency"),
    interval: formData.get("interval") || 1,
    nextOccurrence: formData.get("nextOccurrence"),
  });
  // Falls back to the default account only if the form somehow didn't send
  // one (the dialog always does once at least one account exists) — never
  // silently overrides an explicit user choice.
  const accountIdResult = parsed.accountId
    ? await requireOwnedAccountId(userId, parsed.accountId)
    : await getDefaultAccountId(userId);
  if (isFail(accountIdResult)) return accountIdResult;
  const accountId = accountIdResult;

  await db.insert(recurringRules).values({
    userId,
    accountId,
    categoryId: parsed.categoryId,
    name: parsed.name,
    amount: parsed.amount.toString(),
    type: parsed.type,
    paymentMethod: parsed.paymentMethod,
    frequency: parsed.frequency,
    interval: parsed.interval,
    nextOccurrence: parsed.nextOccurrence,
    // Every recurring expense counts toward the "monthly subscription cost"
    // estimate; only expenses make sense as a "subscription" (you don't
    // subscribe to income), so this needs no separate user input.
    isSubscription: parsed.type === "expense",
  });

  revalidateSubscriptionPaths();
}

const updateRuleSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid(),
  name: z.string().min(1).max(50),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  paymentMethod: paymentMethodSchema,
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.coerce.number().int().positive().default(1),
  nextOccurrence: z.string().min(1),
});

export async function updateRecurringRule(formData: FormData) {
  const userId = await requireUserId();
  const categoryIdRaw = formData.get("categoryId");
  const parsed = updateRuleSchema.parse({
    id: formData.get("id"),
    categoryId: categoryIdRaw ? String(categoryIdRaw) : undefined,
    accountId: formData.get("accountId"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    paymentMethod: formData.get("paymentMethod") || undefined,
    frequency: formData.get("frequency"),
    interval: formData.get("interval") || 1,
    nextOccurrence: formData.get("nextOccurrence"),
  });
  const accountId = await requireOwnedAccountId(userId, parsed.accountId);
  if (isFail(accountId)) return accountId;

  await db
    .update(recurringRules)
    .set({
      categoryId: parsed.categoryId ?? null,
      accountId,
      name: parsed.name,
      amount: parsed.amount.toString(),
      type: parsed.type,
      paymentMethod: parsed.paymentMethod,
      frequency: parsed.frequency,
      interval: parsed.interval,
      nextOccurrence: parsed.nextOccurrence,
      isSubscription: parsed.type === "expense",
    })
    .where(and(eq(recurringRules.id, parsed.id), eq(recurringRules.userId, userId)));

  revalidateSubscriptionPaths();
}

export async function cancelRecurringRule(ruleId: string) {
  const userId = await requireUserId();

  await db
    .update(recurringRules)
    .set({ isActive: false })
    .where(and(eq(recurringRules.id, ruleId), eq(recurringRules.userId, userId)));

  revalidateSubscriptionPaths();
}

// "一鍵入帳" — turns a due occurrence into a real transaction (dated on the
// occurrence itself, not today, so stats reflect when it was actually meant
// to happen) and advances the rule past it.
export async function postRecurringOccurrence(ruleId: string) {
  const userId = await requireUserId();

  const [rule] = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.id, ruleId), eq(recurringRules.userId, userId)));
  if (!rule || !rule.isActive) return fail("找不到指定的定期收支項目");
  if (rule.type === "transfer") return fail("轉帳類型的定期項目尚不支援一鍵入帳");

  const created = await createTransaction({
    categoryId: rule.categoryId ?? undefined,
    type: rule.type,
    amount: Number(rule.amount),
    paymentMethod: rule.paymentMethod,
    accountId: rule.accountId,
    note: rule.name,
    occurredAt: rule.nextOccurrence,
  });
  if (isFail(created)) return created;

  await advanceRule(userId, rule);

  revalidateOccurrencePaths();

  return created;
}

// Marks a due occurrence as "not happening" without recording a
// transaction — otherwise a subscription you cancelled elsewhere would nag
// on the home screen forever with no way to clear it.
export async function skipRecurringOccurrence(ruleId: string) {
  const userId = await requireUserId();

  const [rule] = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.id, ruleId), eq(recurringRules.userId, userId)));
  if (!rule || !rule.isActive) return;

  await advanceRule(userId, rule);

  revalidateOccurrencePaths();
}
