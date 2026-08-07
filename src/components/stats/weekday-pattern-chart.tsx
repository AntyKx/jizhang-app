"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { SLOT_1_COLOR } from "@/components/stats/chart-colors";
import type { WeekdayPoint } from "@/lib/stats/trend-queries";

const chartConfig = {
  avgAmount: { label: "平均每日支出", color: SLOT_1_COLOR },
} satisfies ChartConfig;

export function WeekdayPatternChart({ data }: { data: WeekdayPoint[] }) {
  const hasData = data.some((d) => d.totalAmount > 0);
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">還沒有足夠的資料可以顯示週間消費模式。</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => v.toLocaleString("zh-TW")}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="avgAmount" fill="var(--color-avgAmount)" radius={4} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
