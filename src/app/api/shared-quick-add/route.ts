import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { format } from "date-fns";
import { and, or, eq, isNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories, userSettings } from "@/db/schema";
import { getTodayInTaipei } from "@/lib/date";
import { getAiUsageStatus, recordAiUsage, requireCoreAccessApi } from "@/lib/entitlements";

const sharedQuickAddSchema = z.object({
  amount: z.number().positive().describe("金額，純數字"),
  categoryName: z
    .string()
    .nullable()
    .describe("最符合的分類名稱，須從提供的分類清單中選擇；若無法判斷則為 null"),
  paidByMe: z
    .boolean()
    .describe(
      "誰付款：使用者本人付款為 true；文字中明確提到是對方（另一半）付款則為 false；沒提到就當作使用者本人付款(true)",
    ),
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

  const [expenseCategories, settingsRows] = await Promise.all([
    db
      .select({ name: categories.name })
      .from(categories)
      .where(and(eq(categories.type, "expense"), or(isNull(categories.userId), eq(categories.userId, userId)))),
    db.select({ partnerName: userSettings.partnerName }).from(userSettings).where(eq(userSettings.userId, userId)),
  ]);

  const partnerName = settingsRows[0]?.partnerName || "另一半";
  const today = format(getTodayInTaipei(), "yyyy-MM-dd");

  const { object } = await generateObject({
    model: "anthropic/claude-haiku-4-5",
    schema: sharedQuickAddSchema,
    prompt: `你是分帳記帳助理，將使用者輸入的一句話解析成一筆「分帳支出」。這是使用者跟「${partnerName}」的分帳本，每筆支出兩人平分。
今天日期是 ${today}。
可用分類清單：${expenseCategories.map((c) => c.name).join("、")}

使用者輸入：「${text}」

請解析出金額、最符合的分類名稱（須完全符合上述清單其中之一，否則為 null）、是誰付款（使用者本人或「${partnerName}」）、項目名稱、日期。`,
  });

  await recordAiUsage(userId, "shared_quick_add");

  return NextResponse.json({ result: object });
}
