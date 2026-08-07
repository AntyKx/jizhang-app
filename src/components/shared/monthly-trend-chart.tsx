"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ME_COLOR, PARTNER_COLOR } from "@/components/stats/chart-colors";
import type { SharedMonthlyPoint } from "@/lib/shared-trend";

export function SharedMonthlyTrendChart({
  data,
  partnerName,
}: {
  data: SharedMonthlyPoint[];
  partnerName: string;
}) {
  const hasData = data.some((d) => d.me > 0 || d.partner > 0);
  if (!hasData) {
    return <p className="text-sm text-muted-foreground">還沒有足夠的資料可以顯示趨勢。</p>;
  }

  const chartConfig = {
    me: { label: "你", color: ME_COLOR },
    partner: { label: partnerName, color: PARTNER_COLOR },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => v.toLocaleString("zh-TW")}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="me"
          stackId="shared"
          fill="var(--color-me)"
          radius={[0, 0, 4, 4]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="partner"
          stackId="shared"
          fill="var(--color-partner)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
