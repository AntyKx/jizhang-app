"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { INCOME_COLOR, EXPENSE_COLOR } from "@/components/stats/chart-colors";
import type { SharedMonthlyPoint } from "@/lib/shared-trend";

export function SharedMonthlyTrendChart({ data }: { data: SharedMonthlyPoint[] }) {
  const hasData = data.some((d) => d.owedToMe > 0 || d.iOwe > 0);
  if (!hasData) {
    return <p className="text-sm text-muted-foreground">還沒有足夠的資料可以顯示趨勢。</p>;
  }

  const chartConfig = {
    owedToMe: { label: "別人欠你", color: INCOME_COLOR },
    iOwe: { label: "你欠別人", color: EXPENSE_COLOR },
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
          dataKey="owedToMe"
          stackId="shared"
          fill="var(--color-owedToMe)"
          radius={[0, 0, 4, 4]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="iOwe"
          stackId="shared"
          fill="var(--color-iOwe)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
