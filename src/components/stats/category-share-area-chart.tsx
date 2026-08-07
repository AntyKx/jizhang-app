"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { CategoryShareTrend } from "@/lib/stats/category-queries";

export function CategoryShareAreaChart({ trend }: { trend: CategoryShareTrend }) {
  const hasData = trend.data.some((d) => d.total > 0);
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">還沒有足夠的資料可以顯示分類佔比趨勢。</p>;
  }

  const config: ChartConfig = Object.fromEntries(
    trend.series.map((s) => [s.id, { label: s.name, color: s.color }]),
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <AreaChart data={trend.data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => v.toLocaleString("zh-TW")}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {trend.series.map((s) => (
          <Area
            key={s.id}
            dataKey={s.id}
            name={s.name}
            type="monotone"
            stackId="share"
            fill={`var(--color-${s.id})`}
            stroke={`var(--color-${s.id})`}
            fillOpacity={0.7}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
