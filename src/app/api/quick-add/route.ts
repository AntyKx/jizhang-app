import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { listAccounts } from "@/lib/account";
import { getTodayInTaipei } from "@/lib/date";
import { getAiUsageStatus, recordAiUsage } from "@/lib/entitlements";
import { suggestCategoryForMerchant } from "@/lib/merchant-category-memory";

const quickAddSchema = z.object({
  amount: z.number().positive().describe("交易金額，純數字"),
  type: z.enum(["income", "expense"]).describe("收入或支出"),
  categoryName: z
    .string()
    .nullable()
    .describe("最符合的分類名稱，須從提供的分類清單中選擇；若無法判斷則為 null"),
  paymentMethod: z
    .enum(["cash", "credit_card", "debit_card", "mobile_payment", "auto_debit", "other"])
    .describe(
      "付款方式：提到刷卡/信用卡用 credit_card，金融卡/簽帳卡用 debit_card，Line Pay/街口/Apple Pay等行動支付用 mobile_payment，扣款/訂閱用 auto_debit，沒提到就用 cash",
    ),
  accountName: z
    .string()
    .nullable()
    .describe(
      "最符合的帳戶名稱，須從提供的帳戶清單中選擇；使用者有明確提到帳戶/銀行/卡片名稱才選，否則為 null",
    ),
  merchant: z.string().nullable().describe("商家或對象名稱，若無則為 null"),
  note: z.string().nullable().describe("補充備註，若無則為 null"),
  occurredAt: z
    .string()
    .describe("交易發生日期，格式 yyyy-MM-dd，未提及日期則用今天"),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { text, referenceDate } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "missing text" }, { status: 400 });
  }
  // Lets a caller (e.g. the global quick-add FAB opened from a specific
  // calendar day) override what "today" means for resolving relative dates
  // in the text ("昨天"/"今天"/no date mentioned at all) — falls back to the
  // real today whenever this isn't a valid yyyy-MM-dd string.
  const validReferenceDate =
    typeof referenceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate) ? referenceDate : null;

  const usage = await getAiUsageStatus(userId, "quick_add");
  if (!usage.allowed) {
    const message =
      usage.reason === "rate_limited"
        ? "AI 記帳操作太頻繁，請稍後再試"
        : "本月免費 AI 記帳額度已用完，訂閱解鎖更多額度";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const [userCategories, userAccounts] = await Promise.all([
    db
      .select({ name: categories.name, type: categories.type })
      .from(categories)
      .where(eq(categories.userId, userId)),
    listAccounts(userId),
  ]);

  const today = validReferenceDate ?? format(getTodayInTaipei(), "yyyy-MM-dd");

  const { object } = await generateObject({
    model: "anthropic/claude-haiku-4-5",
    schema: quickAddSchema,
    prompt: `你是記帳助理，將使用者輸入的一句話解析成結構化的記帳資料。
今天日期是 ${today}。
可用分類清單：${userCategories.map((c) => `${c.name}(${c.type})`).join("、")}
可用帳戶清單：${userAccounts.map((a) => a.name).join("、")}

使用者輸入：「${text}」

請解析出金額、收入或支出、最符合的分類名稱（須完全符合上述清單其中之一）、付款方式、最符合的帳戶名稱（只有使用者明確提到才選，須完全符合上述帳戶清單其中之一，否則為 null）、商家、備註與日期。`,
  });

  await recordAiUsage(userId, "quick_add");

  // Prefer how this user has actually categorized this merchant before over
  // the model's fresh guess — no extra AI call, and it's more trustworthy
  // than a generic classification (see merchant-category-memory.ts).
  const rememberedCategory = await suggestCategoryForMerchant(userId, object.merchant, object.type);
  const result = rememberedCategory ? { ...object, categoryName: rememberedCategory } : object;

  return NextResponse.json({ result });
}
