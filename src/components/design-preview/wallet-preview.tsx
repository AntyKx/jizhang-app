"use client";

import { useState } from "react";
import { Check, Plus, RotateCcw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ThemedBear } from "@/components/themed-bear";
import { cn } from "@/lib/utils";

// PREVIEW ONLY — not linked from anywhere; reached by URL. Fake data.

export function WalletPreview() {
  return (
    <div className="flex flex-col gap-6">
      <style>{CSS}</style>
      <PageHeader title="預覽：小熊・光澤" back="/more" />
      <p className="-mt-3 text-xs text-muted-foreground">只是預覽，資料都是假的，不會存任何東西。</p>
      <BearSection />
      <ShineSection />
    </div>
  );
}

const BUBBLES = ["記好了！", "又省一筆～", "今天也很棒", "收到！"];
const POKES = ["嘿嘿", "癢啦！", "要記帳嗎？", "(〃∀〃)"];

function BearSection() {
  const [anim, setAnim] = useState<{ kind: "squash" | "wiggle"; n: number } | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [today, setToday] = useState(285);

  const play = (kind: "squash" | "wiggle", text: string) => {
    setAnim((p) => ({ kind, n: (p?.n ?? 0) + 1 }));
    setBubble(text);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col">
        <h2 className="text-sm font-semibold">1. 小熊會回應你（首頁）</h2>
        <span className="text-xs text-muted-foreground">按「記一筆」，或直接點小熊</span>
      </div>
      <div className="theme-hero relative overflow-hidden rounded-[28px] bg-gradient-to-br from-secondary via-secondary/45 to-transparent">
        <div className="theme-hero-deco" />
        <div className="relative flex items-start justify-between px-5 pt-4 pb-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">午安</span>
              <span className="text-xs text-muted-foreground">11月20日 星期五</span>
            </div>
            <div>
              <span className="text-[10.5px] text-muted-foreground">今日支出</span>
              <div className="text-[22px] font-semibold text-destructive tabular-nums">
                NT$ {today.toLocaleString("zh-TW")}
              </div>
            </div>
          </div>
          <div className="relative">
            {bubble && (
              <span
                key={`b${anim?.n}`}
                className="bear-bubble absolute -top-3 right-[70%] rounded-full rounded-br-sm bg-card px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-md"
                onAnimationEnd={() => setBubble(null)}
              >
                {bubble}
              </span>
            )}
            <button
              type="button"
              aria-label="小熊"
              onClick={() => play("wiggle", POKES[Math.floor(Math.random() * POKES.length)])}
              className="theme-bear relative mt-4 flex size-16 items-center justify-center"
            >
              <span
                key={anim?.n ?? 0}
                className={cn("block size-full", anim && (anim.kind === "squash" ? "bear-squash" : "bear-wiggle"))}
              >
                <ThemedBear className="size-full" />
              </span>
            </button>
          </div>
        </div>
      </div>
      <Button
        onClick={() => {
          setToday((t) => t + 85);
          play("squash", BUBBLES[Math.floor(Math.random() * BUBBLES.length)]);
        }}
      >
        <Plus /> 記一筆 85（假裝）
      </Button>
    </section>
  );
}

function ShineSection() {
  const [on, setOn] = useState(true);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">2. 解鎖按鈕光澤（升級頁）</h2>
          <span className="text-xs text-muted-foreground">每 3 秒一道光掃過</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOn((v) => !v)}>
          <RotateCcw /> {on ? "看原本的" : "看光澤版"}
        </Button>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">NT$120</span>
          <span className="text-sm text-muted-foreground">一次買斷，永久解鎖全部功能</span>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {["沒有月費", "不會自動續訂", "換手機可恢復購買"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check className="size-4 text-primary" strokeWidth={2.5} /> {t}
            </li>
          ))}
        </ul>
        <Button size="lg" className={cn("relative overflow-hidden", on && "shine-btn")}>
          {on && <Sparkles />} 用 Google Play 購買
        </Button>
      </div>
    </section>
  );
}

const CSS = `
@keyframes bear-squash {
  0% { transform: translateY(0) scale(1,1); }
  15% { transform: translateY(0) scale(1.18,.78); }
  40% { transform: translateY(-22px) scale(.9,1.12); }
  62% { transform: translateY(0) scale(1.12,.86); }
  78% { transform: translateY(-5px) scale(.97,1.04); }
  100% { transform: translateY(0) scale(1,1); }
}
@keyframes bear-wiggle {
  0%,100% { transform: rotate(0) scale(1); }
  15% { transform: rotate(-12deg) scale(1.08); }
  35% { transform: rotate(10deg) scale(1.08); }
  55% { transform: rotate(-7deg) scale(1.04); }
  75% { transform: rotate(4deg); }
}
@keyframes bear-bubble {
  0% { opacity: 0; transform: translateY(6px) scale(.6); }
  12% { opacity: 1; transform: translateY(0) scale(1.05); }
  20% { transform: scale(1); }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-6px); }
}
.bear-squash { transform-origin: 50% 100%; animation: bear-squash .7s ease-out; }
.bear-wiggle { transform-origin: 50% 90%; animation: bear-wiggle .6s ease-in-out; }
.bear-bubble { transform-origin: 100% 100%; animation: bear-bubble 1.8s ease-out forwards; }
@keyframes shine-sweep {
  0% { transform: translateX(-120%) skewX(-20deg); }
  35%,100% { transform: translateX(320%) skewX(-20deg); }
}
.shine-btn::after {
  content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 35%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
  animation: shine-sweep 3s ease-in-out infinite; pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .bear-squash, .bear-wiggle, .shine-btn::after { animation: none; }
}
`;
