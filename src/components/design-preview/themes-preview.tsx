"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, ChartPie, House, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ThemeSetting } from "@/components/theme-setting";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CategoryPill } from "@/components/transactions/category-pill";
import { PALETTES, applyPalette, readPalette, subscribePalette } from "@/components/palette-preview";
import { cn } from "@/lib/utils";

const SAMPLE_ROWS = [
  { name: "午餐", category: "餐飲", color: "#f97316", amount: -120 },
  { name: "捷運", category: "交通", color: "#3b82f6", amount: -35 },
  { name: "薪水", category: "薪資", color: "#10b981", amount: 42000 },
  { name: "電影票", category: "娛樂", color: "#a855f7", amount: -320 },
];

const CHART_BARS = [
  { label: "餐飲", pct: 92, color: "var(--chart-1)" },
  { label: "交通", pct: 60, color: "var(--chart-2)" },
  { label: "購物", pct: 48, color: "var(--chart-3)" },
  { label: "娛樂", pct: 33, color: "var(--chart-4)" },
  { label: "其他", pct: 20, color: "var(--chart-5)" },
];

export function ThemesPreview() {
  const selected = useSyncExternalStore(subscribePalette, readPalette, () => null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="主題預覽" back="/more" />

      <p className="text-sm text-muted-foreground">
        這是預覽頁，只有知道網址的人看得到。選一套主題，整個 App 會一起換色，可以到首頁、統計、帳戶頁看看實際效果；選回「焦糖」就恢復原本的顏色。
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">選擇主題</h2>
        <div className="grid grid-cols-3 gap-3">
          {PALETTES.map((p) => {
            const active = selected === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPalette(p.key)}
                aria-pressed={active}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 transition-colors",
                  active && "border-primary ring-2 ring-ring",
                )}
              >
                {/* A tiny phone: background, banner strip, primary button. */}
                <span
                  className="relative flex h-20 w-12 flex-col overflow-hidden rounded-lg border"
                  style={{ backgroundColor: p.colors[0] }}
                >
                  <span className="h-6 w-full" style={{ backgroundColor: p.colors[2] }} />
                  <span className="mx-auto mt-2 h-1.5 w-8 rounded-full" style={{ backgroundColor: p.colors[3] }} />
                  <span className="mx-auto mt-1 h-1.5 w-6 rounded-full" style={{ backgroundColor: p.colors[2] }} />
                  <span
                    className="absolute right-1 bottom-1 size-3.5 rounded-full"
                    style={{ backgroundColor: p.colors[1] }}
                  />
                </span>
                <span className="text-sm font-medium">{p.name}</span>
                {active && (
                  <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
          <span className="text-sm">淺色／深色</span>
          <ThemeSetting />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">首頁上方</h2>
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-secondary via-secondary/45 to-transparent">
          <div className="absolute -top-20 -right-8 size-[150px] rounded-full bg-[color-mix(in_oklch,var(--secondary)_70%,transparent)]" />
          <div className="relative flex flex-col gap-4 px-5 py-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">午安</span>
                <span className="text-xs text-muted-foreground">11月19日・星期四</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/bear-mark-v2.png" alt="" className="size-12 object-contain" />
            </div>
            <div className="flex items-stretch">
              <div className="flex-1">
                <span className="text-[10.5px] text-muted-foreground">今日支出</span>
                <div className="mt-0.5 text-[22px] font-semibold tabular-nums text-destructive">NT$ 475</div>
              </div>
              <div className="mx-4 w-px bg-border" />
              <div className="flex-1">
                <span className="text-[10.5px] text-muted-foreground">本月支出</span>
                <div className="mt-0.5 text-[22px] font-semibold tabular-nums">NT$ 18,260</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">本月預算</span>
                <span className="font-semibold text-primary">預算 61%</span>
              </div>
              <Progress value={61} />
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">交易列表</h2>
        <div className="flex flex-col divide-y rounded-2xl border bg-card">
          {SAMPLE_ROWS.map((r) => (
            <div key={r.name} className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{r.name}</span>
                <CategoryPill name={r.category} color={r.color} />
              </div>
              <span
                className={cn(
                  "text-base font-semibold tabular-nums",
                  r.amount < 0 ? "text-destructive" : "text-income",
                )}
              >
                {r.amount < 0 ? "-" : "+"}NT$ {Math.abs(r.amount).toLocaleString("zh-TW")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">統計圖表</h2>
        <div className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4">
          {CHART_BARS.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-xs text-muted-foreground">{b.label}</span>
              <span className="h-3 rounded-full" style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">按鈕與提示</h2>
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <div className="flex gap-2">
            <Button className="flex-1">儲存</Button>
            <Button variant="secondary" className="flex-1">
              取消
            </Button>
            <Button variant="outline" className="flex-1">
              轉帳
            </Button>
          </div>
          <div className="rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground">小提示：說一句話也能記帳</div>
          <div className="rounded-xl bg-muted px-3 py-2 text-sm text-warning">本月餐飲預算已用 85%</div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">到其他頁面看看</h2>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/record" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
            <House className="size-4" />
            首頁
          </Link>
          <Link href="/stats" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
            <ChartPie className="size-4" />
            統計
          </Link>
          <Link href="/accounts" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
            <Wallet className="size-4" />
            帳戶
          </Link>
        </div>
      </section>
    </div>
  );
}
