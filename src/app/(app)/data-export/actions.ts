"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  accounts,
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
    db.delete(userSettings).where(eq(userSettings.userId, userId)),
  ]);

  revalidatePath("/", "layout");
}

// Replace-style restore: wipes the user's existing content, then loads the
// backup. `userSettings` is intentionally never deleted — only the
// content-safe fields (partnerName/baseCurrency/monthStartDay) are ever
// touched, via a scoped upsert, so a restore can never grant/revoke a
// purchase or subscription. Every inserted row gets the *current* session's
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
    throw new Error("備份檔案格式錯誤，無法還原");
  }

  await db.batch([
    db.delete(sharedExpenses).where(eq(sharedExpenses.userId, userId)),
    db.delete(transactions).where(eq(transactions.userId, userId)),
    db.delete(recurringRules).where(eq(recurringRules.userId, userId)),
    db.delete(budgets).where(eq(budgets.userId, userId)),
    db.delete(savingsGoals).where(eq(savingsGoals.userId, userId)),
    db.delete(accounts).where(eq(accounts.userId, userId)),
    db.delete(categories).where(eq(categories.userId, userId)),
  ]);

  // Sequential, FK-ordered (parents before children) rather than one
  // atomic batch — neon-http's db.batch() needs a fixed-length array
  // literal for correct TS tuple inference, which doesn't work for a
  // variable number of conditionally-included inserts. Known limitation:
  // if a later insert fails, earlier ones in this phase have already
  // committed (the prior wipe above is still atomic).
  if (parsed.categories.length > 0) {
    await db.insert(categories).values(parsed.categories.map((c) => ({ ...c, userId })));
  }
  if (parsed.accounts.length > 0) {
    await db.insert(accounts).values(parsed.accounts.map((a) => ({ ...a, userId })));
  }
  if (parsed.recurringRules.length > 0) {
    await db.insert(recurringRules).values(parsed.recurringRules.map((r) => ({ ...r, userId })));
  }
  if (parsed.transactions.length > 0) {
    await db.insert(transactions).values(parsed.transactions.map((t) => ({ ...t, userId })));
  }
  if (parsed.budgets.length > 0) {
    await db.insert(budgets).values(parsed.budgets.map((b) => ({ ...b, userId })));
  }
  if (parsed.savingsGoals.length > 0) {
    await db.insert(savingsGoals).values(parsed.savingsGoals.map((g) => ({ ...g, userId })));
  }
  if (parsed.sharedExpenses.length > 0) {
    await db.insert(sharedExpenses).values(
      // settledAt is a timestamp column (Date on the wire in/out of
      // drizzle), but the backup JSON only ever carries strings — convert
      // back on the way in, same as every other JSON round trip here.
      parsed.sharedExpenses.map((s) => ({
        ...s,
        userId,
        settledAt: s.settledAt ? new Date(s.settledAt) : null,
      })),
    );
  }

  if (parsed.settings) {
    const { partnerName, baseCurrency, monthStartDay } = parsed.settings;
    await db
      .insert(userSettings)
      .values({ userId, partnerName, baseCurrency, monthStartDay })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { partnerName, baseCurrency, monthStartDay },
      });
  }

  revalidatePath("/", "layout");
}
