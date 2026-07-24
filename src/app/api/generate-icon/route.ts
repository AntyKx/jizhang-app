import { NextResponse } from "next/server";
import { generateImage } from "ai";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { description } = await req.json();
  if (!description || typeof description !== "string") {
    return NextResponse.json({ error: "missing description" }, { status: 400 });
  }

  try {
    const { image } = await generateImage({
      model: "openai/gpt-image-2",
      prompt: `一個可愛、簡約的扁平風格圖示：${description}。置中構圖、單一主體、柔和粉彩色系、乾淨的背景、沒有文字，適合當作記帳 App 的分類圖示。`,
      size: "1024x1024",
    });

    return NextResponse.json({ dataUrl: `data:${image.mediaType};base64,${image.base64}` });
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
