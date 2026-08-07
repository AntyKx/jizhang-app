"use client";

import { useRef } from "react";
import Link from "next/link";
import type { StatsRange, StatsRangeUnit } from "@/lib/stats/range";
import { cn } from "@/lib/utils";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";

const units: { value: StatsRangeUnit; label: string }[] = [
  { value: "week", label: "週" },
  { value: "month", label: "月" },
  { value: "year", label: "年" },
];

export function StatsRangeSwitcher({
  basePath,
  range,
}: {
  basePath: string;
  range: StatsRange;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        ref={containerRef}
        className="relative isolate flex w-fit items-center gap-[3px] rounded-lg bg-muted p-[3px]"
      >
        <SlidingIndicator
          activeKey={range.unit}
          containerRef={containerRef}
          className="-z-10 rounded-md bg-background shadow-sm"
        />
        {units.map((u) => (
          <Link
            key={u.value}
            href={`${basePath}?range=${u.value}`}
            data-key={u.value}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
              range.unit === u.value ? "text-foreground" : "text-foreground/60 hover:text-foreground",
            )}
          >
            {u.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Link
          href={`${basePath}?${range.prevQuery}`}
          className="rounded-full px-2 py-1 text-sm hover:bg-muted"
        >
          ← 上一{range.unit === "week" ? "週" : range.unit === "year" ? "年" : "月"}
        </Link>
        <Link
          href={`${basePath}?${range.todayQuery}`}
          className="min-w-0 flex-1 truncate text-center text-sm font-medium sm:flex-none"
        >
          {range.label}
        </Link>
        <Link
          href={`${basePath}?${range.nextQuery}`}
          className="rounded-full px-2 py-1 text-sm hover:bg-muted"
        >
          下一{range.unit === "week" ? "週" : range.unit === "year" ? "年" : "月"} →
        </Link>
      </div>
    </div>
  );
}
