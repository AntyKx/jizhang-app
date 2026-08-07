"use client";

import { useState } from "react";
import { Camera, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceRecordButton } from "@/components/record/voice-record-button";

export function QuickAddBar({
  onSubmit,
  onScanReceipt,
  placeholder = "午餐麥當勞 185 元，刷信用卡",
}: {
  onSubmit: (text: string) => void;
  onScanReceipt?: () => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-md shadow-foreground/10">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="size-4 text-primary" />
        說一句話快速記帳
      </span>
      {/* One pill holding the input and both actions — receipt scanning is an
          alternative way to fill this same field, so it reads as an input
          affordance rather than its own separate block. */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-8 flex-1 border-none bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
        />
        <VoiceRecordButton onTranscribed={(text) => onSubmit(text)} />
        {onScanReceipt && (
          <button
            type="button"
            onClick={onScanReceipt}
            aria-label="拍照掃收據"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Camera className="size-4" strokeWidth={1.75} />
          </button>
        )}
        <Button
          type="submit"
          size="icon"
          className="shrink-0 rounded-full"
          disabled={!value.trim()}
          aria-label="送出，AI 解析"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
