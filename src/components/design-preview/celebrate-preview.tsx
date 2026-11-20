"use client";

import { useState } from "react";
import { CalendarClock, PartyPopper, PiggyBank, RotateCcw } from "lucide-react";
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
      <PageHeader title="預覽：目標慶祝" back="/more" />
      <p className="text-xs text-muted-foreground">
        只是預覽，不會存任何資料。到「帳號設定」換主題，水和彩紙的顏色會跟著變。
      </p>

      {/* 1. Interactive goal */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">存錢試試看（存滿會噴彩紙）</h2>
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
          <h2 className="text-sm font-semibold">目標清單長這樣</h2>
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
        <h2 className="text-sm font-semibold">只看彩紙</h2>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => fireConfetti({ size: "big" })}>
            <PartyPopper /> 目標達成（大）
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => fireConfetti({ size: "small" })}>
            <PartyPopper /> 預算守住（小）
          </Button>
        </div>
      </section>
    </div>
  );
}
