"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { INCOME_COLOR, EXPENSE_COLOR } from "@/components/stats/chart-colors";

export type AccountMonthPoint = {
  monthKey: string;
  monthLabel: string;
  income: number;
  expense: number;
  isFuture: boolean;
};

const chartConfig = {
  income: { label: "收入", color: INCOME_COLOR },
  expense: { label: "支出", color: EXPENSE_COLOR },
} satisfies ChartConfig;

// Income and expense side by side (not stacked) — a bank account's months
// are often dominated by income, a credit card's by expense, and grouped
// bars read correctly for both.
export function AccountYearChart({ data }: { data: AccountMonthPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }} barGap={1}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="monthLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          tickFormatter={(v: string) => v.replace("月", "")}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => v.toLocaleString("zh-TW")}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={3} isAnimationActive={false} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={3} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
