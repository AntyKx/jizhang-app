"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EXPENSE_COLOR, SLOT_1_COLOR } from "@/components/stats/chart-colors";
import type { BudgetVsActualPoint } from "@/lib/stats/budget-goal-queries";

const chartConfig = {
  limitAmount: { label: "預算", color: SLOT_1_COLOR },
  actual: { label: "實際支出", color: EXPENSE_COLOR },
} satisfies ChartConfig;

export function BudgetVsActualChart({ data }: { data: BudgetVsActualPoint[] }) {
  const hasData = data.some((d) => d.limitAmount != null || d.actual > 0);
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">這個範圍還沒有預算或支出紀錄。</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
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
          dataKey="limitAmount"
          fill="var(--color-limitAmount)"
          radius={4}
          isAnimationActive={false}
        />
        <Bar dataKey="actual" radius={4} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.limitAmount != null && d.actual > d.limitAmount
                  ? "var(--destructive)"
                  : "var(--color-actual)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
