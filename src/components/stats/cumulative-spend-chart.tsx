"use client";

import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EXPENSE_COLOR } from "@/components/stats/chart-colors";
import type { CumulativePoint } from "@/lib/stats/overview-queries";

const chartConfig = {
  cumulative: { label: "累積支出", color: EXPENSE_COLOR },
  budgetPace: { label: "預算等速進度", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function CumulativeSpendChart({ data }: { data: CumulativePoint[] }) {
  const hasData = data.some((d) => d.cumulative > 0);
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">這個範圍還沒有支出紀錄。</p>;
  }
  const hasBudgetPace = data.some((d) => d.budgetPace != null);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <ComposedChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => v.toLocaleString("zh-TW")}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
            />
          }
        />
        <Area
          dataKey="cumulative"
          type="monotone"
          fill="var(--color-cumulative)"
          fillOpacity={0.15}
          stroke="var(--color-cumulative)"
          strokeWidth={2}
          isAnimationActive={false}
        />
        {hasBudgetPace && (
          <Line
            dataKey="budgetPace"
            type="linear"
            stroke="var(--color-budgetPace)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  );
}
