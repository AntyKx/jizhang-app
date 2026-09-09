"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { pickCategoryColor } from "@/lib/category-color";
import { supportedCurrencies } from "@/lib/currency";
import { getExchangeRateToTwd } from "@/lib/fx";
import { hasCoreAccess } from "@/lib/entitlements";
import { fail, isFail, type Fail } from "@/lib/action-result";

// getExchangeRateToTwd throws its own user-facing message (unreachable FX
// API, unsupported currency) — converted to the same fail() shape as this
// file's own validation checks, without changing fx.ts's own signature
// (it's also called from accounts/page.tsx, a plain render path where
// throwing is the correct/existing behavior).
async function tryExchangeRate(currency: string, date: string): Promise<number | Fail> {
  try {
    return await getExchangeRateToTwd(currency, date);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "無法取得匯率，請稍後再試");
  }
}

const accountTypeSchema = z.enum(["cash", "bank", "credit_card", "e_wallet", "investment"]);
const currencySchema = z.enum(
  Object.keys(supportedCurrencies) as [keyof typeof supportedCurrencies, ...(keyof typeof supportedCurrencies)[]],
);

function revalidateAccountPaths() {
  revalidatePath("/accounts");
  revalidatePath("/accounts/archived");
  revalidatePath("/record");
}

const statementDaySchema = z.coerce.number().int().min(1).max(31).nullable().optional();

const createAccountSchema = z.object({
  name: z.string().min(1).max(30),
  type: accountTypeSchema,
  currency: currencySchema.default("TWD"),
  initialBalance: z.coerce.number().default(0),
  excludeFromNetWorth: z.boolean().default(false),
  statementDay: statementDaySchema,
});

export async function createAccount(input: {
  name: string;
  type: "cash" | "bank" | "credit_card" | "e_wallet" | "investment";
  currency?: string;
  initialBalance?: number;
  excludeFromNetWorth?: boolean;
  // Only meaningful for type "credit_card" — ignored (stored as null) for
  // every other type regardless of what's passed in, see below.
  statementDay?: number | null;
}) {
  const userId = await requireUserId();
  const parsed = createAccountSchema.parse(input);

  // Free tier is limited to a single account — multi-account is a
  // core-unlock feature (see src/lib/entitlements.ts). Counts archived
  // accounts too: counting only active ones let the limit be walked past
  // by archiving one, creating another, then unarchiving the first.
  if (!(await hasCoreAccess(userId))) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    if (count >= 1) {
      return fail("免費版限用 1 個帳戶，升級解鎖多帳戶");
    }
  }

  const initialExchangeRate = await tryExchangeRate(parsed.currency, "latest");
  if (isFail(initialExchangeRate)) return initialExchangeRate;

  await db.insert(accounts).values({
    userId,
    name: parsed.name,
    type: parsed.type,
    currency: parsed.currency,
    initialExchangeRate: initialExchangeRate.toString(),
    initialBalance: parsed.initialBalance.toString(),
    currentBalance: parsed.initialBalance.toString(),
    color: pickCategoryColor(parsed.name),
    excludeFromNetWorth: parsed.excludeFromNetWorth,
    statementDay: parsed.type === "credit_card" ? (parsed.statementDay ?? null) : null,
  });

  revalidateAccountPaths();
}

const updateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(30),
  type: accountTypeSchema,
  excludeFromNetWorth: z.boolean(),
  initialBalance: z.coerce.number(),
  statementDay: statementDaySchema,
});

export async function updateAccount(input: {
  id: string;
  name: string;
  type: "cash" | "bank" | "credit_card" | "e_wallet" | "investment";
  excludeFromNetWorth: boolean;
  initialBalance: number;
  statementDay?: number | null;
}) {
  const userId = await requireUserId();
  const parsed = updateAccountSchema.parse(input);

  const [existing] = await db
    .select({ initialBalance: accounts.initialBalance })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.id), eq(accounts.userId, userId)));
  if (!existing) return fail("找不到指定的帳戶");

  // `currentBalance` is a running total (initialBalance + every transaction
  // since), never recomputed from scratch — so correcting a mistyped
  // starting balance has to shift currentBalance by the same delta rather
  // than overwriting it, or every transaction recorded since account
  // creation would silently lose its effect on the balance.
  const delta = parsed.initialBalance - Number(existing.initialBalance);

  await db
    .update(accounts)
    .set({
      name: parsed.name,
      type: parsed.type,
      color: pickCategoryColor(parsed.name),
      excludeFromNetWorth: parsed.excludeFromNetWorth,
      initialBalance: parsed.initialBalance.toString(),
      currentBalance: sql`${accounts.currentBalance} + ${delta}`,
      // Forced to null whenever type isn't (or is changed away from)
      // credit_card, so it can't linger stale if the type changes later.
      statementDay: parsed.type === "credit_card" ? (parsed.statementDay ?? null) : null,
    })
    .where(and(eq(accounts.id, parsed.id), eq(accounts.userId, userId)));

  revalidateAccountPaths();
}

export async function archiveAccount(id: string) {
  const userId = await requireUserId();

  const activeAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)));

  if (activeAccounts.length <= 1 && activeAccounts.some((a) => a.id === id)) {
    return fail("至少要保留一個帳戶，無法封存最後一個帳戶");
  }

  await db
    .update(accounts)
    .set({ isArchived: true })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

  revalidateAccountPaths();
}

export async function unarchiveAccount(id: string) {
  const userId = await requireUserId();

  await db
    .update(accounts)
    .set({ isArchived: false })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

  revalidateAccountPaths();
}

const reorderSchema = z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() }));

export async function reorderAccounts(updates: { id: string; sortOrder: number }[]) {
  const userId = await requireUserId();
  const parsed = reorderSchema.parse(updates);

  await Promise.all(
    parsed.map((u) =>
      db
        .update(accounts)
        .set({ sortOrder: u.sortOrder })
        .where(and(eq(accounts.id, u.id), eq(accounts.userId, userId))),
    ),
  );

  revalidateAccountPaths();
}
