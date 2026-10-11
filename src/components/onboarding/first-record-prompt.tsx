"use client";

import { Mic, Sparkles } from "lucide-react";
import { VOICE_TRY_EVENT } from "@/components/record/voice-record-button";
import { track } from "@/lib/analytics/track";
import { BearIllustration } from "@/components/bear-illustration";

export const FIRST_RECORD_EXAMPLES = ["午餐 95", "捷運 30", "咖啡 65"];

// Picked up by the home page's PersonalAiQuickAddFlow (listenForTry), which
// opens its one-line quick-add sheet already filled in with the example.
export const QUICK_ADD_TRY_EVENT = "jizhang:quick-add-try";

// Replaces the plain "今天還沒有記帳" line on the home page for users who
// have never recorded anything — instead of telling them to record, hands
// them a sentence to try so the first thing they experience is one-line
// quick-add doing the work.
export function FirstRecordPrompt({ onTry }: { onTry?: (example: string) => void }) {
  function tryExample(example: string) {
    track("first_record_chip");
    if (onTry) onTry(example);
    else window.dispatchEvent(new CustomEvent(QUICK_ADD_TRY_EVENT, { detail: example }));
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border bg-card px-5 py-6 text-center">
      <BearIllustration name="record" size={88} />
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold">記下第一筆吧</span>
        <span className="text-sm text-muted-foreground">打一句話就能記帳，點一句試試</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {FIRST_RECORD_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => tryExample(example)}
            className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm text-primary transition-colors active:bg-primary/15"
          >
            <Sparkles className="size-3.5" strokeWidth={2} />
            {example}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            track("first_record_voice_chip");
            window.dispatchEvent(new Event(VOICE_TRY_EVENT));
          }}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm text-primary-foreground transition-colors active:bg-primary/80"
        >
          <Mic className="size-3.5" strokeWidth={2} />
          用說的試試
        </button>
      </div>
      <span className="text-xs text-muted-foreground">也可以點相機拍收據</span>
    </div>
  );
}
