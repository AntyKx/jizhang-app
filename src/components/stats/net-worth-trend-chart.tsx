"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { SLOT_1_COLOR } from "@/components/stats/chart-colors";
import type { NetWorthPoint } from "@/lib/stats/networth-queries";

const chartConfig = {
  netWorth: { label: "淨資產", color: SLOT_1_COLOR },
} satisfies ChartConfig;

export function NetWorthTrendChart({ data }: { data: NetWorthPoint[] }) {
  const hasData = data.some((d) => d.netWorth !== 0);
  if (!hasData) {
    return <p className="text-sm text-muted-foreground">還沒有足夠的帳戶資料可以顯示淨資產趨勢。</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v: number) => v.toLocaleString("zh-TW")}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="netWorth"
          type="monotone"
          fill="var(--color-netWorth)"
          fillOpacity={0.15}
          stroke="var(--color-netWorth)"
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
