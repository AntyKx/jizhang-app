import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";
import { getFrequentSplitNames } from "@/lib/shared-expenses";
import { getAiUsageStatus, recordAiUsage, requireCoreAccessApi } from "@/lib/entitlements";

const sharedQuickAddSchema = z.object({
  amount: z.number().positive().describe("金額，純數字"),
  categoryName: z
    .string()
    .nullable()
    .describe("最符合的分類名稱，須從提供的分類清單中選擇；若無法判斷則為 null"),
  counterpartyName: z.string().describe("分帳對象的姓名——文字中提到的人名；若無法判斷則為空字串"),
  iOwe: z
    .boolean()
    .describe("方向：使用者本人付款、對方欠使用者為 false；對方付款、使用者欠對方則為 true。沒提到就當作使用者本人付款(false)"),
  name: z.string().describe("這筆分帳支出的項目名稱，例如商家或用途，例如「晚餐」「電影」"),
  occurredAt: z
    .string()
    .describe("交易發生日期，格式 yyyy-MM-dd，未提及日期則用今天，需要能解析「昨天」「前天」等相對日期"),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const gate = await requireCoreAccessApi(userId);
  if (gate) return gate;

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "missing text" }, { status: 400 });
  }

  const usage = await getAiUsageStatus(userId, "shared_quick_add");
  if (!usage.allowed) {
    const message =
      usage.reason === "rate_limited"
        ? "AI 記帳操作太頻繁，請稍後再試"
        : "本月免費 AI 記帳額度已用完，訂閱解鎖更多額度";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const [expenseCategories, frequentNames] = await Promise.all([
    db
      .select({ name: categories.name })
      .from(categories)
      .where(and(eq(categories.type, "expense"), eq(categories.userId, userId))),
    getFrequentSplitNames(userId),
  ]);

  const today = format(getTodayInTaipei(), "yyyy-MM-dd");

  const { object } = await generateObject({
    model: "anthropic/claude-haiku-4-5",
    schema: sharedQuickAddSchema,
    prompt: `你是分帳記帳助理，將使用者輸入的一句話解析成一筆「分帳支出」——使用者跟某位朋友或家人分攤的一筆花費。
今天日期是 ${today}。
可用分類清單：${expenseCategories.map((c) => c.name).join("、")}
使用者最近常分帳的對象（若文字中提到類似名字，優先比對這份清單）：${frequentNames.join("、") || "（無）"}

使用者輸入：「${text}」

請解析出金額、最符合的分類名稱（須完全符合上述清單其中之一，否則為 null）、分帳對象的姓名、方向（使用者付款則對方欠使用者 iOwe=false；對方付款則使用者欠對方 iOwe=true）、項目名稱、日期。`,
  });

  await recordAiUsage(userId, "shared_quick_add");

  return NextResponse.json({ result: object });
}
