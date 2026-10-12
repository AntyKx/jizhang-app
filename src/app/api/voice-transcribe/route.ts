import { NextResponse } from "next/server";
import { transcribe } from "ai";
import { auth } from "@clerk/nextjs/server";
import { getAiUsageStatus, recordAiUsage } from "@/lib/entitlements";

const TRANSCRIBE_PROMPT =
  "這是記帳用的中文語音輸入，內容通常是金額、商家、消費項目，例如：午餐麥當勞120元刷卡、水果攤買芭樂50元、傳統市場買菜200元現金。";

// Phrases speech models are known to produce from silence or noise (they
// were trained on subtitled video), never something said to a ledger app.
// Not bare "訂閱": "Netflix 訂閱 390" is a real entry.
const HALLUCINATION_MARKERS = ["字幕", "訂閱頻道", "訂閱我", "點贊", "點讚", "謝謝觀看", "感謝觀看", "感謝收看", "amara", "請不吝"];

function normalize(text: string) {
  return text.toLowerCase().replace(/[\s，。、,.!?！？:：；;「」"'（）()]/g, "");
}

const NORMALIZED_PROMPT = normalize(TRANSCRIBE_PROMPT);

// Given near-silent audio the model tends to echo back its own prompt —
// usually one of the example entries, which then parses into a perfectly
// plausible fake record. Treat any output that's just a piece of the prompt,
// or a known subtitle-style hallucination, as "heard nothing".
function looksHallucinated(text: string) {
  const n = normalize(text);
  if (!n) return true;
  // Length floor so a real short entry that happens to overlap an example
  // ("買菜200元") still goes through; every full example is longer.
  if (n.length >= 8 && NORMALIZED_PROMPT.includes(n)) return true;
  return HALLUCINATION_MARKERS.some((m) => n.includes(m));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { audioBase64 } = await req.json();
  if (!audioBase64 || typeof audioBase64 !== "string") {
    return NextResponse.json({ error: "missing audio" }, { status: 400 });
  }

  // A voice entry is transcribe + the text parse it feeds into
  // (api/quick-add/route.ts). Only that parse spends the user's 記帳 quota,
  // so voice and typing cost the same — the transcription itself is logged
  // under its own "voice_transcribe" kind, which still counts toward the
  // hourly rate limit and has its own monthly cap (so this endpoint can't be
  // called on its own without bound). Requiring quick_add quota up front
  // keeps a user who's out of it from transcribing audio they then can't use.
  const [usage, voiceUsage] = await Promise.all([
    getAiUsageStatus(userId, "quick_add"),
    getAiUsageStatus(userId, "voice_transcribe"),
  ]);
  const blocked = !usage.allowed ? usage : !voiceUsage.allowed ? voiceUsage : null;
  if (blocked) {
    const message =
      blocked.reason === "rate_limited"
        ? "一句話記帳操作太頻繁，請稍後再試"
        : "本月一句話記帳次數已用完，下個月 1 號會重置（免費版可到「升級」解鎖更多額度）";
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
          prompt: TRANSCRIBE_PROMPT,
        },
      },
    });
    text = result.text.trim();
  } catch {
    return NextResponse.json({ error: "語音辨識失敗，請再試一次" }, { status: 502 });
  }

  if (!text || looksHallucinated(text)) {
    // Still counted: the transcription call was made and paid for.
    if (text) await recordAiUsage(userId, "voice_transcribe");
    return NextResponse.json({ error: "沒有聽到聲音，再說一次看看" }, { status: 422 });
  }

  await recordAiUsage(userId, "voice_transcribe");

  return NextResponse.json({ text });
}
