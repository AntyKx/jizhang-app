import { Sparkles } from "lucide-react";

// Shown above every one-line / receipt quick-add draft: the marketing copy
// says 一句話記帳 rather than "AI", so this is where the user is told the
// fields were filled in by AI and should be checked before saving.
export function AiParsedNote({ fields = "金額和分類" }: { fields?: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Sparkles className="size-3.5 shrink-0 text-primary" />
      由 AI 解析，送出前請確認{fields}
    </p>
  );
}
