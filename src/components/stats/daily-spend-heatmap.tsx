import { format, getDay, parse } from "date-fns";
import { SEQUENTIAL_HEATMAP_STEPS } from "@/components/stats/chart-colors";
import type { HeatmapDay } from "@/lib/stats/trend-queries";

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

export function DailySpendHeatmap({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0 || days.every((d) => d.amount === 0)) {
    return <p className="text-muted-foreground text-sm">還沒有足夠的資料可以顯示熱力圖。</p>;
  }

  const firstDate = parse(days[0].date, "yyyy-MM-dd", new Date());
  const leadingBlanks = getDay(firstDate);
  const cells: (HeatmapDay | null)[] = [...(Array(leadingBlanks).fill(null) as null[]), ...days];

  const weekCount = Math.ceil(cells.length / 7);
  const columns: (HeatmapDay | null)[][] = [];
  for (let w = 0; w < weekCount; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  let lastMonth = "";
  const monthLabels = columns.map((col) => {
    const firstCell = col.find((c) => c != null);
    if (!firstCell) return "";
    const month = firstCell.date.slice(0, 7);
    if (month === lastMonth) return "";
    lastMonth = month;
    return format(parse(firstCell.date, "yyyy-MM-dd", new Date()), "M月");
  });

  return (
    <div className="flex flex-col gap-1 overflow-x-auto pb-2">
      <div className="flex gap-[3px] pl-6">
        {monthLabels.map((label, i) => (
          <div key={i} className="text-muted-foreground w-[11px] shrink-0 text-[9px]">
            {label}
          </div>
        ))}
      </div>
      <div className="flex gap-[3px]">
        <div className="text-muted-foreground flex flex-col gap-[3px] pr-1 text-[9px]">
          {weekdayLabels.map((l, i) => (
            <div key={i} className="flex h-[11px] w-4 items-center">
              {i % 2 === 1 ? l : ""}
            </div>
          ))}
        </div>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell, ri) =>
              cell ? (
                <div
                  key={ri}
                  title={`${cell.date} · ${Math.round(cell.amount).toLocaleString("zh-TW")}`}
                  className="h-[11px] w-[11px] rounded-[2px]"
                  style={{ backgroundColor: SEQUENTIAL_HEATMAP_STEPS[cell.level] }}
                />
              ) : (
                <div key={ri} className="h-[11px] w-[11px]" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
