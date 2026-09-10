"use server";

import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  accounts,
  aiUsageEvents,
  budgets,
  categories,
  recurringRules,
  savingsGoals,
  sharedExpenses,
  transactions,
  userSettings,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { requireCoreAccess } from "@/lib/entitlements";
import { backupSchema } from "@/lib/backup-schema";
import { fail } from "@/lib/action-result";

// The neon-http driver has no interactive `db.transaction`, but does support
// `db.batch([...])` — multiple statements sent as one request and executed
// atomically by Neon. FK order is preserved (children before the parents
// they reference) even though these all commit together.
export async function deleteAllUserData() {
  const userId = await requireUserId();

  await db.batch([
    db.delete(sharedExpenses).where(eq(sharedExpenses.userId, userId)),
    db.delete(transactions).where(eq(transactions.userId, userId)),
    db.delete(recurringRules).where(eq(recurringRules.userId, userId)),
    db.delete(budgets).where(eq(budgets.userId, userId)),
    db.delete(savingsGoals).where(eq(savingsGoals.userId, userId)),
    db.delete(accounts).where(eq(accounts.userId, userId)),
    db.delete(categories).where(eq(categories.userId, userId)),
    // AI usage history counts as this user's data too — /privacy promises
    // deletion covers everything, and leaving these behind would also
    // outlive the Clerk account itself when this runs as part of
    // delete-account (see account-settings.tsx).
    db.delete(aiUsageEvents).where(eq(aiUsageEvents.userId, userId)),
    db.delete(userSettings).where(eq(userSettings.userId, userId)),
  ]);

  revalidatePath("/", "layout");
}

// Replace-style restore, applied as a single all-or-nothing batch: either
// the backup fully lands or the account is untouched. `userSettings` is
// intentionally never deleted — only the
// content-safe fields (baseCurrency/monthStartDay) are ever touched, via a
// scoped upsert, so a restore can never grant/revoke a purchase or
// subscription. Every inserted row gets the *current* session's
// userId injected fresh — the file's own contents never carry one, and even
// if they did it would be ignored, so an uploaded backup can never write
// into another account's data.
export async function restoreBackup(backupJson: string) {
  const userId = await requireUserId();
  await requireCoreAccess(userId, "restore-backup");

  let parsed;
  try {
    parsed = backupSchema.parse(JSON.parse(backupJson));
  } catch {
    return fail("備份檔案格式錯誤，無法還原");
  }

  // Wipe and reload in ONE batch, so a restore is all-or-nothing. Splitting
  // them (an atomic wipe followed by sequential inserts) meant a failure
  // partway through the insert phase left the account holding a half-loaded
  // ledger with its original data already gone — the worst possible outcome
  // for the one operation people reach for when something has already gone
  // wrong. Ordering inside the array is preserved by Neon, so deletes run
  // children-before-parents and inserts run parents-before-children.
  //
  // The array is built dynamically (empty tables are skipped, since
  // .values([]) is invalid) and cast at the call, because db.batch()'s
  // signature wants a fixed-length tuple purely to type the *results* —
  // which this caller ignores. The 7 deletes guarantee it's never empty.
  const ops: BatchItem<"pg">[] = [
    db.delete(sharedExpenses).where(eq(sharedExpenses.userId, userId)),
    db.delete(transactions).where(eq(transactions.userId, userId)),
    db.delete(recurringRules).where(eq(recurringRules.userId, userId)),
    db.delete(budgets).where(eq(budgets.userId, userId)),
    db.delete(savingsGoals).where(eq(savingsGoals.userId, userId)),
    db.delete(accounts).where(eq(accounts.userId, userId)),
    db.delete(categories).where(eq(categories.userId, userId)),
  ];

  if (parsed.categories.length > 0) {
    ops.push(db.insert(categories).values(parsed.categories.map((c) => ({ ...c, userId }))));
  }
  if (parsed.accounts.length > 0) {
    ops.push(db.insert(accounts).values(parsed.accounts.map((a) => ({ ...a, userId }))));
  }
  if (parsed.recurringRules.length > 0) {
    ops.push(db.insert(recurringRules).values(parsed.recurringRules.map((r) => ({ ...r, userId }))));
  }
  if (parsed.transactions.length > 0) {
    ops.push(db.insert(transactions).values(parsed.transactions.map((t) => ({ ...t, userId }))));
  }
  if (parsed.budgets.length > 0) {
    ops.push(db.insert(budgets).values(parsed.budgets.map((b) => ({ ...b, userId }))));
  }
  if (parsed.savingsGoals.length > 0) {
    ops.push(db.insert(savingsGoals).values(parsed.savingsGoals.map((g) => ({ ...g, userId }))));
  }
  if (parsed.sharedExpenses.length > 0) {
    ops.push(db.insert(sharedExpenses).values(parsed.sharedExpenses.map((s) => ({ ...s, userId }))));
  }

  if (parsed.settings) {
    const { baseCurrency, monthStartDay } = parsed.settings;
    // Only carried over when the account it points at is actually part of
    // this same backup — a dangling id would fail the FK and abort the
    // whole restore over a preference that just falls back to "自動".
    const restoredAccountIds = new Set(parsed.accounts.map((a) => a.id));
    const defaultAccountId =
      parsed.settings.defaultAccountId && restoredAccountIds.has(parsed.settings.defaultAccountId)
        ? parsed.settings.defaultAccountId
        : null;
    ops.push(
      db
        .insert(userSettings)
        .values({ userId, baseCurrency, monthStartDay, defaultAccountId })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { baseCurrency, monthStartDay, defaultAccountId },
        }),
    );
  }

  try {
    await db.batch(ops as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  } catch (err) {
    // Nothing was applied — the whole batch rolled back — so the account is
    // exactly as it was before the attempt, which is what makes it safe to
    // just tell the user to try again.
    console.error("[restoreBackup] failed:", err);
    return fail("還原失敗，資料維持原狀，請確認備份檔案後再試一次");
  }

  revalidatePath("/", "layout");
}
