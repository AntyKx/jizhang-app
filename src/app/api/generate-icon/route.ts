import { NextResponse } from "next/server";
import { generateImage } from "ai";
import { auth } from "@clerk/nextjs/server";
import { getAiUsageStatus, recordAiUsage, requireCoreAccessApi } from "@/lib/entitlements";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Image generation is the most expensive AI call in the app — it was the
  // only one with no entitlement/usage gate at all, and stays reachable by
  // direct POST even while icon-picker.tsx hides its UI tab.
  const gate = await requireCoreAccessApi(userId);
  if (gate) return gate;

  const { description } = await req.json();
  if (!description || typeof description !== "string" || description.length > 100) {
    return NextResponse.json({ error: "missing description" }, { status: 400 });
  }

  const usage = await getAiUsageStatus(userId, "icon_generation");
  if (!usage.allowed) {
    return NextResponse.json({ error: "AI 圖示生成次數已達上限，請稍後再試" }, { status: 429 });
  }

  try {
    const { image } = await generateImage({
      model: "openai/gpt-image-2",
      prompt: `一個可愛、簡約的扁平風格圖示：${description}。置中構圖、單一主體、柔和粉彩色系、乾淨的背景、沒有文字，適合當作記帳 App 的分類圖示。`,
      size: "1024x1024",
    });
    await recordAiUsage(userId, "icon_generation");

    return NextResponse.json({ dataUrl: `data:${image.mediaType};base64,${image.base64}` });
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
