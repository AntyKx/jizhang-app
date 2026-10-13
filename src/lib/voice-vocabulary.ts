import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";

// Total length cap for the joined word list. The transcribe prompt is a
// hint, not a dictionary — OpenAI only reads a short prompt (whisper-style
// models keep roughly the last couple hundred tokens), and a long list
// dilutes the bias toward any one word. Frequent merchants go first so
// they're what survives the cut.
const MAX_VOCAB_CHARS = 160;

// Words this user actually says when logging — their own merchant names,
// category names and account names — so the speech model hears "全聯"
// or "悠遊卡" instead of a same-sounding guess. Standard vocabulary is
// already covered by the fixed example prompt; these are the words only
// this user's data knows about.
export async function getVoiceVocabulary(userId: string): Promise<string[]> {
  const [merchantRows, categoryRows, accountRows] = await Promise.all([
    db
      .select({ merchant: transactions.merchant })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNotNull(transactions.merchant)))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(300),
    db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.sortOrder),
    db
      .select({ name: accounts.name })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)))
      .orderBy(accounts.sortOrder),
  ]);

  const countByMerchant = new Map<string, number>();
  for (const { merchant } of merchantRows) {
    const name = merchant?.trim();
    if (name) countByMerchant.set(name, (countByMerchant.get(name) ?? 0) + 1);
  }
  const merchants = [...countByMerchant.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);

  const words: string[] = [];
  const seen = new Set<string>();
  let length = 0;
  for (const raw of [...merchants, ...categoryRows.map((c) => c.name), ...accountRows.map((a) => a.name)]) {
    const word = raw.trim();
    // Skip long free-text-ish names; a vocabulary hint is for short proper nouns.
    if (!word || word.length > 12 || seen.has(word)) continue;
    if (length + word.length + 1 > MAX_VOCAB_CHARS) break;
    seen.add(word);
    words.push(word);
    length += word.length + 1;
  }
  return words;
}
