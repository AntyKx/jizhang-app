import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { format } from "date-fns";
import { or, eq, isNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories } from "@/db/schema";

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

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "missing text" }, { status: 400 });
  }

  const userCategories = await db
    .select({ name: categories.name, type: categories.type })
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)));

  const today = format(new Date(), "yyyy-MM-dd");

  const { object } = await generateObject({
    model: "anthropic/claude-haiku-4-5",
    schema: quickAddSchema,
    prompt: `你是記帳助理，將使用者輸入的一句話解析成結構化的記帳資料。
今天日期是 ${today}。
可用分類清單：${userCategories.map((c) => `${c.name}(${c.type})`).join("、")}

使用者輸入：「${text}」

請解析出金額、收入或支出、最符合的分類名稱（須完全符合上述清單其中之一）、付款方式、商家、備註與日期。`,
  });

  return NextResponse.json({ result: object });
}
