"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { CalendarClock, Minus, PartyPopper, PiggyBank, Plus, RotateCcw } from "lucide-react";
import { DayNightSwitch } from "@/components/day-night-switch";
import { RollingNumber } from "@/components/motion/rolling-number";
import { CountUpNumber } from "@/components/motion/count-up-number";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LiquidJar } from "@/components/goals/liquid-jar";
import { fireConfetti } from "@/components/motion/confetti";
import { cn } from "@/lib/utils";

const TARGET = 30000;
const SAMPLES = [
  { name: "新筆電", current: 4500, target: 30000, date: "2027-03-01" },
  { name: "緊急預備金", current: 52000, target: 100000, date: null },
  { name: "生日禮物", current: 3000, target: 3000, date: null },
];

const fmt = (n: number) => n.toLocaleString("zh-TW");

// PREVIEW ONLY — not linked from anywhere; reached by URL. Tries the goal
// jar + confetti on a real phone before wiring them into /goals.
export function CelebratePreview() {
  const [style, setStyle] = useState<"jar" | "bar">("jar");
  const [saved, setSaved] = useState(21000);

  const add = (n: number) => {
    const next = Math.min(TARGET, saved + n);
    if (saved < TARGET && next >= TARGET) setTimeout(() => fireConfetti(), 900);
    setSaved(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="預覽：動畫效果" back="/more" />
      <p className="text-xs text-muted-foreground">
        只是預覽，不會存任何資料（第 3 項的開關例外，會真的切換深淺色）。到「帳號設定」換主題，顏色會跟著變。
      </p>

      {/* 1. Interactive goal */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">1+2. 存錢試試看（存滿會噴彩紙）</h2>
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
          <LiquidJar pct={(saved / TARGET) * 100} size={88} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">日本旅遊基金</span>
              {saved >= TARGET && <Badge>已達成</Badge>}
            </div>
            <span className="text-sm tabular-nums">
              {fmt(saved)}
              <span className="text-muted-foreground"> / {fmt(TARGET)}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {saved >= TARGET ? "恭喜！目標達成" : `還差 ${fmt(TARGET - saved)}`}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => add(3000)} disabled={saved >= TARGET}>
            <PiggyBank /> 存 3,000
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => add(10000)} disabled={saved >= TARGET}>
            <PiggyBank /> 存 10,000
          </Button>
          <Button variant="ghost" size="icon" aria-label="重設" onClick={() => setSaved(21000)}>
            <RotateCcw />
          </Button>
        </div>
      </section>

      {/* 2. List comparison */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">2. 目標清單長這樣</h2>
          <div className="flex rounded-full bg-muted p-0.5 text-xs">
            {(
              [
                ["jar", "水位球"],
                ["bar", "原本進度條"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setStyle(k)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors",
                  style === k ? "bg-card shadow-sm" : "text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card px-4">
          {SAMPLES.map((g) => {
            const pct = (g.current / g.target) * 100;
            const done = pct >= 100;
            return style === "jar" ? (
              <div key={g.name} className="flex items-center gap-3 py-3.5">
                <LiquidJar pct={pct} size={60} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{g.name}</span>
                    {done && <Badge>已達成</Badge>}
                  </div>
                  <span className="text-sm tabular-nums">
                    {fmt(g.current)}
                    <span className="text-muted-foreground"> / {fmt(g.target)}</span>
                  </span>
                  {g.date && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="size-3.5" strokeWidth={1.75} />
                      {g.date}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div key={g.name} className="flex flex-col gap-3 py-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{g.name}</span>
                  {done && <Badge>已達成</Badge>}
                </div>
                <div className="flex justify-between text-sm tabular-nums">
                  <span>{fmt(g.current)}</span>
                  <span className="text-muted-foreground">/ {fmt(g.target)}</span>
                </div>
                <Progress value={pct} />
                {g.date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" strokeWidth={1.75} />
                    {g.date}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Confetti alone */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">1. 只看彩紙</h2>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => fireConfetti({ size: "big" })}>
            <PartyPopper /> 目標達成（大）
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => fireConfetti({ size: "small" })}>
            <PartyPopper /> 預算守住（小）
          </Button>
        </div>
      </section>

      <DayNightSection />
      <RollingSection />
      <DrawChartSection />
    </div>
  );
}

const noopSubscribe = () => () => {};

function DayNightSection() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">3. 日月切換開關（會真的切換）</h2>
      <div className="flex flex-col divide-y rounded-2xl border bg-card px-4">
        <div className="flex items-center justify-between py-3.5">
          <div className="flex flex-col">
            <span className="text-sm font-medium">深色模式</span>
            <span className="text-xs text-muted-foreground">{dark ? "夜晚" : "白天"}</span>
          </div>
          {mounted && <DayNightSwitch dark={dark} onChange={(d) => setTheme(d ? "dark" : "light")} />}
        </div>
        <label className="flex items-center justify-between py-3 text-sm">
          <span className="text-muted-foreground">跟隨手機系統</span>
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={mounted && theme === "system"}
            onChange={(e) => setTheme(e.target.checked ? "system" : resolvedTheme ?? "light")}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        原本是「淺色／深色／跟隨系統」三格切換，這裡改成開關 + 下方一個「跟隨手機系統」勾選。
      </p>
    </section>
  );
}

function RollingSection() {
  const [balance, setBalance] = useState(18650);
  const [replay, setReplay] = useState(0);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">4. 金額滾輪數字</h2>
        <Button variant="ghost" size="sm" onClick={() => setReplay((r) => r + 1)}>
          <RotateCcw /> 重播
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
          <span className="text-xs text-muted-foreground">現在：跳數字</span>
          <span className="text-2xl font-bold tabular-nums">
            <CountUpNumber key={replay} value={balance} />
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
          <span className="text-xs text-muted-foreground">新：滾輪</span>
          <span className="text-2xl font-bold">
            <RollingNumber key={replay} value={balance} />
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setBalance((b) => b - 185)}>
          <Minus /> 記一筆 185
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setBalance((b) => b + 32000)}>
          <Plus /> 薪水 32,000
        </Button>
      </div>
    </section>
  );
}

const MONTHS = ["6月", "7月", "8月", "9月", "10月", "11月"];
const SPEND = [21400, 18200, 24800, 19600, 16900, 20300];

function DrawChartSection() {
  const [replay, setReplay] = useState(0);
  const W = 320;
  const H = 150;
  const pad = { l: 12, r: 12, t: 16, b: 26 };
  const max = 28000;
  const min = 12000;
  const pts = SPEND.map((v, i) => [
    pad.l + (i * (W - pad.l - pad.r)) / (SPEND.length - 1),
    pad.t + ((max - v) / (max - min)) * (H - pad.t - pad.b),
  ]);
  // Smooth curve: cubic segments with horizontal tangents at midpoints.
  let line = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    line += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  const area = `${line} L${pts.at(-1)![0]} ${H - pad.b} L${pts[0][0]} ${H - pad.b} Z`;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">5. 趨勢線手繪生長</h2>
        <Button variant="ghost" size="sm" onClick={() => setReplay((r) => r + 1)}>
          <RotateCcw /> 重播
        </Button>
      </div>
      <div className="rounded-2xl border bg-card p-4">
        <span className="text-xs text-muted-foreground">近 6 個月支出</span>
        <svg key={replay} viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
          <defs>
            <linearGradient id="draw-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity="0.3" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2].map((i) => (
            <line
              key={i}
              x1={pad.l}
              x2={W - pad.r}
              y1={pad.t + (i * (H - pad.t - pad.b)) / 2}
              y2={pad.t + (i * (H - pad.t - pad.b)) / 2}
              stroke="var(--border)"
              strokeDasharray="3 4"
            />
          ))}
          <path d={area} fill="url(#draw-area)" className="jz-draw-fill" />
          <path
            d={line}
            pathLength={1}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            className="jz-draw"
          />
          {pts.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === pts.length - 1 ? 5 : 3.5}
              fill="var(--card)"
              stroke="var(--primary)"
              strokeWidth="2.5"
              className="jz-draw-dot"
              style={{ animationDelay: `${(i / (pts.length - 1)) * 1.2 + 0.1}s` }}
            />
          ))}
          {pts.map(([x], i) => (
            <text key={MONTHS[i]} x={x} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
              {MONTHS[i]}
            </text>
          ))}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">
        線像畫筆一樣從左畫到右，經過的點一個個跳出來，最後底下的顏色淡入。正式版會套到統計頁現有的趨勢圖上。
      </p>
    </section>
  );
}
