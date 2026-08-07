"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EXPENSE_COLOR, INCOME_COLOR } from "@/components/stats/chart-colors";
import type { TrendPoint } from "@/lib/stats/overview-queries";

const chartConfig = {
  income: { label: "收入", color: INCOME_COLOR },
  expense: { label: "支出", color: EXPENSE_COLOR },
} satisfies ChartConfig;

export function IncomeExpenseTrendChart({ data }: { data: TrendPoint[] }) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">還沒有足夠的資料可以顯示趨勢。</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => v.toLocaleString("zh-TW")}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="income"
          type="monotone"
          stroke="var(--color-income)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="expense"
          type="monotone"
          stroke="var(--color-expense)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
