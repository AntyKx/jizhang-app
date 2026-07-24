"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { getDefaultAccountId } from "@/lib/account";
import { bumpStreak } from "@/lib/streak";

const createTransactionSchema = z.object({
  categoryId: z.string().uuid().optional(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive(),
  paymentMethod: z
    .enum(["cash", "credit_card", "debit_card", "mobile_payment", "auto_debit", "other"])
    .default("cash"),
  note: z.string().max(200).optional(),
  merchant: z.string().max(100).optional(),
  occurredAt: z.string().min(1),
});

export async function createTransaction(input: {
  categoryId?: string;
  type: "income" | "expense";
  amount: number;
  paymentMethod?: "cash" | "credit_card" | "debit_card" | "mobile_payment" | "auto_debit" | "other";
  note?: string;
  merchant?: string;
  occurredAt: string;
}) {
  const userId = await requireUserId();
  const parsed = createTransactionSchema.parse(input);
  const accountId = await getDefaultAccountId(userId);

  await db.insert(transactions).values({
    userId,
    accountId,
    categoryId: parsed.categoryId,
    type: parsed.type,
    amount: parsed.amount.toString(),
    paymentMethod: parsed.paymentMethod,
    note: parsed.note,
    merchant: parsed.merchant,
    occurredAt: parsed.occurredAt,
  });

  const delta = parsed.type === "expense" ? -parsed.amount : parsed.amount;
  await db
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  await bumpStreak(userId);

  revalidatePath("/record");
  revalidatePath("/calendar");
  revalidatePath("/stats");
}

export async function deleteTransaction(transactionId: string) {
  const userId = await requireUserId();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  if (!tx) return;

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  const delta = tx.type === "expense" ? Number(tx.amount) : -Number(tx.amount);
  await db
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
    .where(and(eq(accounts.id, tx.accountId), eq(accounts.userId, userId)));

  revalidatePath("/record");
  revalidatePath("/calendar");
  revalidatePath("/stats");
}
