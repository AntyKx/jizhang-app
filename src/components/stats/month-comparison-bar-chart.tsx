"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EXPENSE_COLOR } from "@/components/stats/chart-colors";
import type { MonthComparisonPoint } from "@/lib/stats/trend-queries";

const chartConfig = {
  expense: { label: "本期", color: EXPENSE_COLOR },
  expenseLastYear: { label: "去年同期", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function MonthComparisonBarChart({ data }: { data: MonthComparisonPoint[] }) {
  const hasData = data.some((d) => d.expense > 0);
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">還沒有足夠的資料可以比較。</p>;
  }
  const hasLastYear = data.some((d) => d.expenseLastYear != null);

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
        <Bar dataKey="expense" fill="var(--color-expense)" radius={4} isAnimationActive={false} />
        {hasLastYear && (
          <Bar
            dataKey="expenseLastYear"
            fill="var(--color-expenseLastYear)"
            radius={4}
            isAnimationActive={false}
          />
        )}
      </BarChart>
    </ChartContainer>
  );
}
