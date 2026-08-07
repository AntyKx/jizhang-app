import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { format } from "date-fns";
import { and, or, eq, isNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { listAccounts } from "@/lib/account";
import { getTodayInTaipei } from "@/lib/date";
import { getAiUsageStatus, recordAiUsage } from "@/lib/entitlements";
import { suggestCategoryForMerchant } from "@/lib/merchant-category-memory";

const receiptScanSchema = z.object({
  amount: z.number().positive().describe("收據上的總金額，純數字"),
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

  const { imageBase64, mediaType } = await req.json();
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "missing image" }, { status: 400 });
  }

  const usage = await getAiUsageStatus(userId, "receipt_scan");
  if (!usage.allowed) {
    const message =
      usage.reason === "rate_limited"
        ? "AI 收據辨識操作太頻繁，請稍後再試"
        : "本月免費收據辨識額度已用完，訂閱解鎖更多額度";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const [expenseCategories, userAccounts] = await Promise.all([
    db
      .select({ name: categories.name })
      .from(categories)
      .where(
        and(eq(categories.type, "expense"), or(isNull(categories.userId), eq(categories.userId, userId))),
      ),
    listAccounts(userId),
  ]);

  const today = format(getTodayInTaipei(), "yyyy-MM-dd");

  const { object } = await generateObject({
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

請仔細看清楚金額（通常是「總計」「合計」「應付金額」旁的數字，不是單項價格），分類須完全符合上述清單其中之一，否則為 null。`,
          },
          { type: "file", mediaType: mediaType || "image/jpeg", data: imageBase64 },
        ],
      },
    ],
  });

  await recordAiUsage(userId, "receipt_scan");

  // Prefer how this user has actually categorized this merchant before over
  // the model's fresh guess — no extra AI call, and it's more trustworthy
  // than a generic classification (see merchant-category-memory.ts).
  const rememberedCategory = await suggestCategoryForMerchant(userId, object.merchant, "expense");
  const result = rememberedCategory ? { ...object, categoryName: rememberedCategory } : object;

  return NextResponse.json({ result });
}
