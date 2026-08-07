"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { iconOptions } from "@/lib/icon-options";
import { bearIcons } from "@/lib/bear-icons";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

// Temporarily hidden (2026-07-29) — flip back to true to re-expose the tab.
const AI_ICON_GENERATION_ENABLED = false;

export function IconPicker({
  icon,
  onIconChange,
  onBearLabel,
}: {
  icon: string | null;
  onIconChange: (icon: string) => void;
  onBearLabel?: (label: string) => void;
}) {
  const [pickerTab, setPickerTab] = useState<"emoji" | "bear" | "ai">("emoji");
  const [aiDescription, setAiDescription] = useState("");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!aiDescription.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescription }),
      });
      if (!res.ok) throw new Error("generation failed");
      const { dataUrl } = (await res.json()) as { dataUrl: string };
      onIconChange(dataUrl);
    } catch {
      toast.error("圖示生成失敗，請再試一次");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => setPickerTab("emoji")}
          className={cn(
            "border-b-2 pb-1",
            pickerTab === "emoji"
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground",
          )}
        >
          選圖示
        </button>
        <button
          type="button"
          onClick={() => setPickerTab("bear")}
          className={cn(
            "border-b-2 pb-1",
            pickerTab === "bear"
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground",
          )}
        >
          🐻 小熊圖示
        </button>
        {AI_ICON_GENERATION_ENABLED && (
          <button
            type="button"
            onClick={() => setPickerTab("ai")}
            className={cn(
              "border-b-2 pb-1",
              pickerTab === "ai"
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            🎨 AI 生成
          </button>
        )}
      </div>

      {pickerTab === "emoji" ? (
        <div className="grid max-h-56 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border p-2">
          {iconOptions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onIconChange(emoji)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-xl transition-colors",
                icon === emoji ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : pickerTab === "bear" ? (
        <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto rounded-xl border p-2">
          {bearIcons.map((b) => (
            <button
              key={b.slug}
              type="button"
              onClick={() => {
                onIconChange(b.path);
                onBearLabel?.(b.label);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors",
                icon === b.path ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted",
              )}
            >
              <CategoryIcon icon={b.path} className="h-10 w-10" />
              <span className="text-[10px] text-muted-foreground">{b.label}</span>
            </button>
          ))}
        </div>
      ) : AI_ICON_GENERATION_ENABLED ? (
        <div className="flex flex-col gap-3 rounded-xl border p-3">
          <Input
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            placeholder="描述你想要的圖示，例如「一隻可愛的柴犬」"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerate}
            disabled={generating || !aiDescription.trim()}
          >
            {generating ? "生成中…（約需幾秒）" : "生成圖示"}
          </Button>
          {icon?.startsWith("data:") && (
            <div className="flex items-center gap-3">
              <CategoryIcon icon={icon} className="h-16 w-16 rounded-xl border" />
              <span className="text-sm text-muted-foreground">已選用這張圖示</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
