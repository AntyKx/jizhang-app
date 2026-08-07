"use client";

import { ResponsiveContainer, Sankey, Tooltip, Rectangle } from "recharts";
import type { CashFlowSankeyData } from "@/lib/stats/cashflow-queries";

type NodePayload = {
  name: string;
  value: number;
  depth: number;
  color?: string;
};

function SankeyNodeShape(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: NodePayload;
}) {
  const { x, y, width, height, payload } = props;
  const isSource = payload.depth === 0;

  return (
    <g>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color ?? "var(--muted-foreground)"}
        fillOpacity={0.85}
      />
      <text
        x={isSource ? x - 6 : x + width + 6}
        y={y + height / 2 - 6}
        textAnchor={isSource ? "end" : "start"}
        className="fill-foreground text-[11px]"
      >
        {payload.name}
      </text>
      <text
        x={isSource ? x - 6 : x + width + 6}
        y={y + height / 2 + 8}
        textAnchor={isSource ? "end" : "start"}
        className="fill-muted-foreground text-[10px]"
      >
        NT$ {Math.round(payload.value).toLocaleString("zh-TW")}
      </text>
    </g>
  );
}

export function CashFlowSankeyChart({ data }: { data: CashFlowSankeyData | null }) {
  if (!data || data.nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">這段時間還沒有收入紀錄，無法顯示金流圖。</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.nodes.length * 34)}>
      <Sankey
        data={data}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recharts' NodeProps type doesn't model the custom `color` field we attach to node data
        node={SankeyNodeShape as any}
        link={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.2 }}
        nodePadding={28}
        nodeWidth={10}
        margin={{ top: 8, right: 96, bottom: 8, left: 96 }}
      >
        <Tooltip formatter={(value) => `NT$ ${Math.round(Number(value)).toLocaleString("zh-TW")}`} />
      </Sankey>
    </ResponsiveContainer>
  );
}
