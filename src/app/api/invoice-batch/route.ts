import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getAiUsageStatus, recordAiUsage } from "@/lib/entitlements";
import { suggestCategoryForMerchant } from "@/lib/merchant-category-memory";
import { describeItemsForPrompt, eInvoiceSchema } from "@/lib/einvoice/schema";
import { lookupSellerNames } from "@/lib/einvoice/seller-name";
import { findRecordedInvoices } from "@/app/(app)/transactions/actions";

const MAX_INVOICES = 50;

const bodySchema = z.object({ invoices: z.array(eInvoiceSchema).min(1).max(MAX_INVOICES) });

const resultSchema = z.object({
  results: z.array(
    z.object({
      invoiceNumber: z.string(),
      merchant: z.string().nullable().describe("一般人熟悉的店名，例如「統一超商股份有限公司」→「7-ELEVEN」；判斷不出來就是 null"),
      categoryName: z.string().nullable().describe("須從分類清單中選擇；無法判斷則為 null"),
    }),
  ),
});

// 連續掃描發票: the amounts/dates/items already came off the QR codes on the
// phone, so the model only names the shop and picks a category — one text
// call for the whole stack, metered as a single receipt scan. If the quota
// is used up or the model fails, it still returns the registered company
// names and remembered categories, never an error.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { invoices } = parsed.data;

  const [expenseCategories, sellerNames, recorded, usage] = await Promise.all([
    db
      .select({ name: categories.name })
      .from(categories)
      .where(and(eq(categories.type, "expense"), eq(categories.userId, userId))),
    lookupSellerNames(invoices.map((i) => i.sellerId)),
    findRecordedInvoices(invoices.map((i) => i.invoiceNumber)),
    getAiUsageStatus(userId, "receipt_scan"),
  ]);
  const categoryNames = new Set(expenseCategories.map((c) => c.name));

  let ai = new Map<string, { merchant: string | null; categoryName: string | null }>();
  if (usage.allowed) {
    const generated = await generateObject({
      model: "anthropic/claude-haiku-4-5",
      schema: resultSchema,
      prompt: `你是記帳助理。以下是使用者掃描的電子發票，請為每一張判斷商家（一般人熟悉的店名）和最符合的支出分類。
可用分類清單：${expenseCategories.map((c) => c.name).join("、")}

${invoices
  .map(
    (inv) =>
      `發票 ${inv.invoiceNumber}：賣方公司登記名稱 ${sellerNames.get(inv.sellerId) ?? "（查不到）"}，金額 ${inv.total}，品項：${describeItemsForPrompt(inv.items)}`,
  )
  .join("\n")}`,
    }).catch(() => null);
    if (generated) {
      await recordAiUsage(userId, "receipt_scan");
      ai = new Map(generated.object.results.map((r) => [r.invoiceNumber, r]));
    }
  }

  const recordedOn = new Map(recorded.map((r) => [r.invoiceNumber, r.occurredAt]));
  const results = await Promise.all(
    invoices.map(async (inv) => {
      const guess = ai.get(inv.invoiceNumber);
      const merchant = guess?.merchant ?? sellerNames.get(inv.sellerId) ?? null;
      // Same as single receipts: how this user filed this shop before wins.
      const remembered = await suggestCategoryForMerchant(userId, merchant, "expense");
      const categoryName = remembered ?? (guess?.categoryName && categoryNames.has(guess.categoryName) ? guess.categoryName : null);
      return { invoiceNumber: inv.invoiceNumber, merchant, categoryName, alreadyRecordedOn: recordedOn.get(inv.invoiceNumber) ?? null };
    }),
  );

  return NextResponse.json({ results, aiUsed: ai.size > 0 });
}
