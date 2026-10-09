"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AI_GROUPS, AI_GROUP_KEYS, type AiDay } from "@/lib/admin/ai-groups";

const axisProps = { tickLine: false, axisLine: false } as const;

// Single series — the card title names it, so no legend.
export function DailyBarChart({
  data,
  label,
}: {
  data: { day: string; value: number }[];
  label: string;
}) {
  const config = { value: { label, color: "var(--primary)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" {...axisProps} tickMargin={8} minTickGap={16} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis {...axisProps} width={32} allowDecimals={false} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}

// See lib/admin/ai-groups.ts for the grouping and why these colors.
export function AiStackedChart({ data }: { data: AiDay[] }) {
  const keys = AI_GROUP_KEYS;
  return (
    <ChartContainer config={AI_GROUPS satisfies ChartConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" {...axisProps} tickMargin={8} minTickGap={16} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis {...axisProps} width={32} allowDecimals={false} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {/* 2px card-colored stroke = the surface gap between stacked segments */}
        {keys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            stackId="ai"
            fill={`var(--color-${k})`}
            stroke="var(--card)"
            strokeWidth={2}
            radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
