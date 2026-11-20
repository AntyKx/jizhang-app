"use client";

import { createContext, useContext, useState } from "react";
import { Check, Plus, RotateCcw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { ThemedBear } from "@/components/themed-bear";
import type { AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

// PREVIEW ONLY — not linked from anywhere; reached by URL. Fake data.

type DemoAccount = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  sub: string;
  bg: string;
  monthIn: number;
  monthOut: number;
  recent: { label: string; amount: number; date: string }[];
};

const ACCOUNTS: DemoAccount[] = [
  {
    id: "cash",
    name: "錢包現金",
    type: "cash",
    balance: 3240,
    sub: "現金",
    bg: "linear-gradient(135deg,#7bc47f,#3f8f5a)",
    monthIn: 5000,
    monthOut: 4120,
    recent: [
      { label: "早餐", amount: -65, date: "11/20" },
      { label: "便當", amount: -110, date: "11/19" },
      { label: "提款", amount: 3000, date: "11/18" },
    ],
  },
  {
    id: "bank",
    name: "薪轉帳戶",
    type: "bank",
    balance: 86520,
    sub: "銀行・末四碼 2817",
    bg: "linear-gradient(135deg,#5aa6e6,#2f5fa8)",
    monthIn: 46000,
    monthOut: 21300,
    recent: [
      { label: "薪水", amount: 46000, date: "11/05" },
      { label: "房租", amount: -15000, date: "11/05" },
      { label: "轉帳到 LINE Pay", amount: -2000, date: "11/03" },
    ],
  },
  {
    id: "card",
    name: "回饋信用卡",
    type: "credit_card",
    balance: -12480,
    sub: "信用卡・結帳日 每月 25 日",
    bg: "linear-gradient(135deg,#4a4a5e,#1f2030)",
    monthIn: 0,
    monthOut: 12480,
    recent: [
      { label: "網購", amount: -2390, date: "11/18" },
      { label: "加油", amount: -1200, date: "11/16" },
      { label: "電影", amount: -640, date: "11/15" },
    ],
  },
  {
    id: "wallet",
    name: "LINE Pay",
    type: "e_wallet",
    balance: 1050,
    sub: "電子支付",
    bg: "linear-gradient(135deg,#4fd0b0,#13917f)",
    monthIn: 2000,
    monthOut: 950,
    recent: [
      { label: "超商", amount: -89, date: "11/19" },
      { label: "飲料", amount: -60, date: "11/17" },
    ],
  },
  {
    id: "invest",
    name: "台股 ETF",
    type: "investment",
    balance: 152300,
    sub: "投資",
    bg: "linear-gradient(135deg,#a98be8,#6145b0)",
    monthIn: 3000,
    monthOut: 0,
    recent: [{ label: "定期定額", amount: 3000, date: "11/06" }],
  },
];

const fmt = (n: number) => `${n < 0 ? "-" : ""}NT$ ${Math.abs(n).toLocaleString("zh-TW")}`;

const CARD_H = 196;
const PEEK = 58;

export function WalletPreview() {
  return (
    <div className="flex flex-col gap-6">
      <style>{CSS}</style>
      <PageHeader title="預覽：錢包・小熊・光澤" back="/more" />
      <p className="-mt-3 text-xs text-muted-foreground">只是預覽，資料都是假的，不會存任何東西。</p>
      <WalletSection />
      <BearSection />
      <ShineSection />
    </div>
  );
}

function WalletSection() {
  const [selected, setSelected] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [themed, setThemed] = useState(true);
  const net = ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const selIndex = ACCOUNTS.findIndex((a) => a.id === selected);
  const stackH = selected ? CARD_H + 24 + (ACCOUNTS.length - 1) * 12 : PEEK * (ACCOUNTS.length - 1) + CARD_H;

  const pick = (id: string) => {
    if (selected === id) setFlipped((f) => !f);
    else {
      setSelected(id);
      setFlipped(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">1. 錢包卡片（帳戶頁）</h2>
          <span className="text-xs text-muted-foreground">
            {selected ? "再點一下卡片翻面，點下面的卡換一張" : "點一張卡片拿出來"}
          </span>
        </div>
        {selected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelected(null);
              setFlipped(false);
            }}
          >
            收起
          </Button>
        )}
      </div>

      <div className="flex rounded-full bg-muted p-0.5 text-xs">
        {(
          [
            [true, "A：跟著主題"],
            [false, "原本：固定彩色"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setThemed(v)}
            className={cn(
              "flex-1 rounded-full py-1.5 font-medium transition-colors",
              themed === v ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-baseline justify-between px-1">
        <span className="text-xs text-muted-foreground">淨資產</span>
        <span className="text-xl font-bold tabular-nums">{fmt(net)}</span>
      </div>

      <ThemedCardsContext.Provider value={themed}>
      <div className="relative transition-[height] duration-500" style={{ height: stackH }}>
        {ACCOUNTS.map((a, i) => {
          const isSel = a.id === selected;
          let y: number;
          let scale = 1;
          if (!selected) y = i * PEEK;
          else if (isSel) y = 0;
          else {
            const j = i < selIndex ? i : i - 1;
            y = CARD_H + 24 + j * 12;
            scale = 0.94 + j * 0.012;
          }
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a.id)}
              className="absolute inset-x-0 top-0 [perspective:1200px]"
              style={{
                height: CARD_H,
                zIndex: isSel ? 50 : i + 1,
                transform: `translateY(${y}px) scale(${scale})`,
                transition: "transform 550ms cubic-bezier(.3,1.25,.4,1)",
              }}
            >
              <div
                className="relative size-full transition-transform duration-700 [transform-style:preserve-3d]"
                style={{ transform: isSel && flipped ? "rotateY(180deg)" : "none" }}
              >
                <CardFront a={a} />
                <CardBack a={a} />
              </div>
            </button>
          );
        })}
      </div>
      </ThemedCardsContext.Provider>
      <p className="text-xs text-muted-foreground">
        到「帳號設定」換主題再回來，整疊卡會換成那個主題的顏色。
      </p>
    </section>
  );
}

const ThemedCardsContext = createContext(true);

// Option A: every card is a tone of the active theme's --primary (relative
// color syntax), so the stack belongs to whichever theme is on. Lightness
// is fixed per tone (not taken from the theme) so white text always reads,
// even on themes whose primary is pale (星空夜's gold).
// [lightness start, lightness end, chroma factor, hue shift]
const TONES: Record<AccountType, [number, number, number, number]> = {
  bank: [0.64, 0.5, 1, 0], // 主色
  cash: [0.72, 0.58, 0.85, -18], // 淺、偏暖
  credit_card: [0.48, 0.34, 0.7, 12], // 深
  e_wallet: [0.66, 0.52, 0.95, 32], // 鄰近色
  investment: [0.6, 0.46, 0.4, 0], // 低彩度（奶茶）
  loan: [0.42, 0.3, 0.5, -10],
};

function themedCardBg(type: AccountType) {
  const [l1, l2, c, h] = TONES[type];
  const tone = (l: number) => `oklch(from var(--primary) ${l} calc(c * ${c}) calc(h + ${h}))`;
  return `linear-gradient(135deg, ${tone(l1)}, ${tone(l2)})`;
}

function CardFront({ a }: { a: DemoAccount }) {
  const themed = useContext(ThemedCardsContext);
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-left text-white shadow-[0_-2px_10px_rgba(0,0,0,0.12),0_10px_24px_-10px_rgba(0,0,0,0.45)] [backface-visibility:hidden]"
      style={{ background: themed ? themedCardBg(a.type) : a.bg }}
    >
      {/* soft shine */}
      <span className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/15" />
      <span className="pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-black/10" />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-white/20">
            <AccountTypeIcon type={a.type} className="size-4" />
          </span>
          {a.name}
        </span>
        <span className="text-base font-bold tabular-nums">{fmt(a.balance)}</span>
      </div>
      <div className="relative flex items-end justify-between">
        <span className="text-xs text-white/75">{a.sub}</span>
        <span className="text-[10px] tracking-widest text-white/60">小熊記帳本</span>
      </div>
    </div>
  );
}

function CardBack({ a }: { a: DemoAccount }) {
  return (
    <div className="absolute inset-0 flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{a.name}・本月</span>
        <span className="text-xs text-muted-foreground">點一下翻回去</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted px-3 py-1.5">
          <div className="text-[10.5px] text-muted-foreground">收入</div>
          <div className="text-sm font-semibold text-income tabular-nums">{fmt(a.monthIn)}</div>
        </div>
        <div className="rounded-xl bg-muted px-3 py-1.5">
          <div className="text-[10.5px] text-muted-foreground">支出</div>
          <div className="text-sm font-semibold text-destructive tabular-nums">{fmt(a.monthOut)}</div>
        </div>
      </div>
      <div className="flex flex-col divide-y text-xs">
        {a.recent.slice(0, 3).map((r) => (
          <div key={r.label + r.date} className="flex justify-between py-1">
            <span>
              <span className="text-muted-foreground">{r.date}</span> {r.label}
            </span>
            <span className={cn("tabular-nums", r.amount < 0 ? "text-destructive" : "text-income")}>
              {r.amount > 0 ? "+" : ""}
              {r.amount.toLocaleString("zh-TW")}
            </span>
          </div>
        ))}
      </div>
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
        <h2 className="text-sm font-semibold">2. 小熊會回應你（首頁）</h2>
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
          <h2 className="text-sm font-semibold">3. 解鎖按鈕光澤（升級頁）</h2>
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
