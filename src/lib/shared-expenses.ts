import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sharedExpenses, type SplitParticipant } from "@/db/schema";

// Derives a transaction-list row's split fields from the leftJoin'd
// sharedExpenses.participants column (null when the transaction isn't
// split). Used by every query that lists transactions alongside their
// linked split — loadMoreTransactions and the equivalent first-page queries
// on /record, /calendar, /transactions and an account's detail page.
export function deriveSplitFields(participants: SplitParticipant[] | null) {
  return {
    isSharedExpense: participants !== null,
    splitParticipants: (participants ?? []).map((p) => ({ name: p.name, amount: p.amount })),
    splitLocked: (participants ?? []).some((p) => p.isSettled),
  };
}

// One counterparty's row in a split-expense event, flattened out of
// sharedExpenses.participants for display — a single real event ("週末聚餐
// $3000 split 4 ways") becomes N of these, one per person, so the /shared
// page can group and sort by counterparty without caring that they all came
// from the same underlying record.
export type FlatSplitItem = {
  sharedExpenseId: string;
  participantIndex: number;
  itemName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  occurredAt: string;
  linkedTransactionId: string | null;
} & SplitParticipant;

export function flattenSharedExpenseRows(
  rows: {
    id: string;
    name: string;
    categoryId: string | null;
    categoryName: string | null;
    categoryIcon: string | null;
    categoryColor: string | null;
    occurredAt: string;
    linkedTransactionId: string | null;
    participants: SplitParticipant[];
  }[],
): FlatSplitItem[] {
  const flat: FlatSplitItem[] = [];
  for (const row of rows) {
    row.participants.forEach((p, participantIndex) => {
      flat.push({
        sharedExpenseId: row.id,
        participantIndex,
        itemName: row.name,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryIcon: row.categoryIcon,
        categoryColor: row.categoryColor,
        occurredAt: row.occurredAt,
        linkedTransactionId: row.linkedTransactionId,
        ...p,
      });
    });
  }
  return flat;
}

// "常用分帳對象" suggestions for the split-participant input — scans the
// most recent split events (not the whole history; plenty for a personal
// app's volume) and ranks names by how often they show up, most recent
// first as the tiebreak. Replaces the old fixed userSettings.partnerName —
// a name just naturally rises to the top of this list instead of living in
// its own settings field.
export async function getFrequentSplitNames(userId: string, limit = 8): Promise<string[]> {
  const rows = await db
    .select({ participants: sharedExpenses.participants })
    .from(sharedExpenses)
    .where(eq(sharedExpenses.userId, userId))
    .orderBy(desc(sharedExpenses.createdAt))
    .limit(100);

  const countByName = new Map<string, number>();
  for (const row of rows) {
    for (const p of row.participants) {
      countByName.set(p.name, (countByName.get(p.name) ?? 0) + 1);
    }
  }

  return [...countByName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}
