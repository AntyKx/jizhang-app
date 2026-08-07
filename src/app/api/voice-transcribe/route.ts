import { NextResponse } from "next/server";
import { transcribe } from "ai";
import { auth } from "@clerk/nextjs/server";
import { getAiUsageStatus, recordAiUsage } from "@/lib/entitlements";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { audioBase64 } = await req.json();
  if (!audioBase64 || typeof audioBase64 !== "string") {
    return NextResponse.json({ error: "missing audio" }, { status: 400 });
  }

  // Counted against the same "quick_add" bucket as the text parse it feeds
  // into right after (see api/quick-add/route.ts) — a voice entry costs two
  // model calls (transcribe + parse), so it burns free quota twice as fast
  // as typing. That's a deliberate starting point, not an oversight: tune
  // later against real usage the same way the other quota numbers were set.
  const usage = await getAiUsageStatus(userId, "quick_add");
  if (!usage.allowed) {
    const message =
      usage.reason === "rate_limited"
        ? "AI 記帳操作太頻繁，請稍後再試"
        : "本月免費 AI 記帳額度已用完，訂閱解鎖更多額度";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  let text: string;
  try {
    const result = await transcribe({
      // Upgraded from openai/whisper-1 — OpenAI's newer transcribe models
      // report a lower word error rate (accents, background noise, speech
      // rate), which is exactly the failure mode a user hit: "芭樂" (guava)
      // getting misheard as "8" and merged into the amount ("135芭樂刷卡"
      // -> "1358元"). Same provider/gateway as before, so this is a
      // same-shape swap, not a new integration.
      model: "openai/gpt-4o-transcribe",
      audio: Buffer.from(audioBase64, "base64"),
      // `language` cuts down on mis-detecting the language on short clips
      // (a common trigger for garbled/hallucinated output); `prompt`
      // primes it toward the expected vocabulary. Widened past chain-store
      // examples to include a traditional-market/produce phrase too — the
      // original prompt's only example ("午餐麥當勞120元刷卡") had nothing
      // to compete against a numeral-sounding guess for words like "芭樂",
      // which starts with the same syllable as "八" (eight).
      providerOptions: {
        openai: {
          language: "zh",
          prompt:
            "這是記帳用的中文語音輸入，內容通常是金額、商家、消費項目，例如：午餐麥當勞120元刷卡、水果攤買芭樂50元、傳統市場買菜200元現金。",
        },
      },
    });
    text = result.text.trim();
  } catch {
    return NextResponse.json({ error: "語音辨識失敗，請再試一次" }, { status: 502 });
  }

  if (!text) {
    return NextResponse.json({ error: "沒有聽到聲音，再說一次看看" }, { status: 422 });
  }

  await recordAiUsage(userId, "quick_add");

  return NextResponse.json({ text });
}
