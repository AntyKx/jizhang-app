import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { listAccounts } from "@/lib/account";
import { getTodayInTaipei } from "@/lib/date";
import { getAiUsageStatus, recordAiUsage } from "@/lib/entitlements";
import { suggestCategoryForMerchant } from "@/lib/merchant-category-memory";
import { describeItemsForPrompt, eInvoiceSchema } from "@/lib/einvoice/schema";
import { itemsToNote } from "@/lib/einvoice/qr";
import { lookupSellerNames } from "@/lib/einvoice/seller-name";
import { findRecordedInvoices } from "@/app/(app)/transactions/actions";

const receiptScanSchema = z.object({
  // Nullable for the same reason as quick-add: a photo that isn't a receipt
  // would otherwise come back with an invented total.
  amount: z.number().positive().nullable().describe("收據上的總金額，純數字；照片不是收據或看不到金額就是 null，不要猜"),
  categoryName: z
    .string()
    .nullable()
    .describe("最符合的分類名稱，須從提供的分類清單中選擇；無法判斷則為 null"),
  paymentMethod: z
    .enum(["cash", "credit_card", "debit_card", "mobile_payment", "auto_debit", "other"])
    .describe(
      "付款方式：收據上有明確標示（例如卡號末四碼、VISA/Mastercard 字樣）才選對應的，看不出來就用 cash",
    ),
  accountName: z
    .string()
    .nullable()
    .describe("最符合的帳戶名稱，須從提供的帳戶清單中選擇；沒有明確線索就是 null"),
  merchant: z.string().nullable().describe("商家或店名，若無則為 null"),
  note: z.string().nullable().describe("值得記錄的補充資訊，例如品項摘要，沒有則為 null"),
  occurredAt: z
    .string()
    .describe("收據上的交易日期，格式 yyyy-MM-dd；看不出日期則用今天"),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { imageBase64, mediaType, invoice: rawInvoice } = await req.json();
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "missing image" }, { status: 400 });
  }
  // Decoded on the phone from the e-invoice's QR codes (lib/einvoice) when
  // the photo has them: exact amount, date, invoice number and items.
  const invoiceParsed = rawInvoice ? eInvoiceSchema.safeParse(rawInvoice) : null;
  const invoice = invoiceParsed?.success ? invoiceParsed.data : null;

  const usage = await getAiUsageStatus(userId, "receipt_scan");
  if (!usage.allowed) {
    const message =
      usage.reason === "rate_limited"
        ? "收據辨識操作太頻繁，請稍後再試"
        : "本月收據辨識額度已用完，下個月 1 號會重置（免費版可到「升級」解鎖更多額度）";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const [expenseCategories, userAccounts, sellerNames, recorded] = await Promise.all([
    db
      .select({ name: categories.name })
      .from(categories)
      .where(
        and(eq(categories.type, "expense"), eq(categories.userId, userId)),
      ),
    listAccounts(userId),
    invoice ? lookupSellerNames([invoice.sellerId]) : null,
    invoice ? findRecordedInvoices([invoice.invoiceNumber]) : [],
  ]);
  const sellerName = invoice ? (sellerNames?.get(invoice.sellerId) ?? null) : null;
  const invoiceHint = invoice
    ? `

這是一張電子發票，以下是從 QR Code 讀到的準確資料，金額和日期以此為準：
日期 ${invoice.date}、總金額 ${invoice.total}
賣方公司登記名稱：${sellerName ?? "（查不到）"}
品項：${describeItemsForPrompt(invoice.items)}
商家請寫一般人熟悉的店名（例如「統一超商股份有限公司」寫「7-ELEVEN」），照片上有店名就以照片為準；分類請參考品項判斷。`
    : "";

  const today = format(getTodayInTaipei(), "yyyy-MM-dd");

  // Same as quick-add: a model/gateway failure (or an unreadable photo) is
  // expected, not a bug — give the user something actionable, not a 500.
  const generated = await generateObject({
    model: "anthropic/claude-haiku-4-5",
    schema: receiptScanSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `你是記帳助理，請解析這張收據/發票照片，抓出總金額、最符合的分類、付款方式、帳戶、商家與交易日期。
今天日期是 ${today}。
可用分類清單：${expenseCategories.map((c) => c.name).join("、")}
可用帳戶清單：${userAccounts.map((a) => a.name).join("、")}

請仔細看清楚金額（通常是「總計」「合計」「應付金額」旁的數字，不是單項價格），分類須完全符合上述清單其中之一，否則為 null。${invoiceHint}`,
          },
          { type: "file", mediaType: mediaType || "image/jpeg", data: imageBase64 },
        ],
      },
    ],
  }).catch(() => null);
  if (!generated && !invoice) {
    return NextResponse.json({ error: "收據辨識失敗，請換一張清楚的照片再試，或手動記帳" }, { status: 502 });
  }
  if (generated) await recordAiUsage(userId, "receipt_scan");
  if (!invoice && generated?.object.amount == null) {
    return NextResponse.json({ error: "看不出這張照片的金額，請拍清楚收據的總計，或手動記帳" }, { status: 422 });
  }

  // With a QR code, its numbers win over what the model read off the paper,
  // and the items become the note. If the model failed, the QR data alone
  // still fills in everything but the category.
  const object = invoice
    ? {
        paymentMethod: "cash" as const,
        accountName: null,
        categoryName: null,
        note: null,
        ...generated?.object,
        merchant: generated?.object.merchant ?? sellerName,
        amount: invoice.total,
        occurredAt: invoice.date,
        ...(itemsToNote(invoice.items) ? { note: itemsToNote(invoice.items) } : {}),
      }
    : { ...generated!.object, amount: generated!.object.amount! };

  // Prefer how this user has actually categorized this merchant before over
  // the model's fresh guess — no extra AI call, and it's more trustworthy
  // than a generic classification (see merchant-category-memory.ts).
  const rememberedCategory = await suggestCategoryForMerchant(userId, object.merchant, "expense");
  const result = rememberedCategory ? { ...object, categoryName: rememberedCategory } : object;

  return NextResponse.json({
    result,
    invoiceNumber: invoice?.invoiceNumber ?? null,
    alreadyRecordedOn: recorded[0]?.occurredAt ?? null,
  });
}
