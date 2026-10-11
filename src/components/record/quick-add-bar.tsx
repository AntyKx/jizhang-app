"use client";

import { useState } from "react";
import { Camera, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceRecordButton } from "@/components/record/voice-record-button";

export function QuickAddBar({
  onSubmit,
  onScanReceipt,
  placeholder = "打一句話，或按麥克風用說的",
  listenForVoiceTry = false,
}: {
  onSubmit: (text: string) => void;
  onScanReceipt?: () => void;
  placeholder?: string;
  listenForVoiceTry?: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  }

  // Flat single row, no wrapping card/pill — the leading sparkle icon is
  // what signals "this is AI parsing" now that there's no label line above
  // it, consistent with the rest of the home page's cardless layout.
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b py-2">
      <Sparkles className="size-3.5 shrink-0 text-primary" />
      {/* text-base (16px), not smaller: iOS Safari zooms the whole page in
          when focusing an input under 16px and never zooms back out. */}
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-auto flex-1 border-none bg-transparent px-0 py-0 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0"
      />
      <VoiceRecordButton onTranscribed={(text) => onSubmit(text)} listenForVoiceTry={listenForVoiceTry} />
      {onScanReceipt && (
        <button
          type="button"
          onClick={onScanReceipt}
          aria-label="拍照掃收據"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Camera className="size-3.5" strokeWidth={1.75} />
        </button>
      )}
      <Button
        type="submit"
        size="icon-sm"
        className="shrink-0 rounded-full"
        disabled={!value.trim()}
        aria-label="送出"
      >
        <Send className="size-3.5" />
      </Button>
    </form>
  );
}
