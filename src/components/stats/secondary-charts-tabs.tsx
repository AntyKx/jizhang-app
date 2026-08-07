"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DailySpendHeatmap } from "@/components/stats/daily-spend-heatmap";
import { WeekdayPatternChart } from "@/components/stats/weekday-pattern-chart";
import { CategoryBreakdown } from "@/components/stats/category-breakdown";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import type { HeatmapDay, WeekdayPoint } from "@/lib/stats/trend-queries";
import { cn } from "@/lib/utils";

type PaymentRow = { name: string; icon: string | null; amount: number; color: string };

const tabs = [
  { key: "heatmap", label: "熱力圖" },
  { key: "weekday", label: "週間模式" },
  { key: "payment", label: "付款方式" },
] as const;

// Replaces 3 separately stacked full-width Cards with one Card + in-page
// segmented control — cuts /stats/daily's vertical scroll length without
// introducing a new interaction pattern (same tab-switch UX as StatsTabNav/
// StatsRangeSwitcher elsewhere on this page). Chosen 2026-07-31 over a
// horizontal swipe-carousel alternative for consistency + discoverability.
export function SecondaryChartsTabs({
  heatmapDays,
  weekdayPattern,
  paymentRows,
}: {
  heatmapDays: HeatmapDay[];
  weekdayPattern: WeekdayPoint[];
  paymentRows: PaymentRow[];
}) {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("heatmap");
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef(true);

  // Scroll the whole card (tabs included) to the top of the viewport on
  // switch, not just "nudge the content edge into view" — with a donut
  // chart the payment tab used to run 500px+ tall, taller than most phone
  // viewports, so no amount of nudging could ever show all of it at once;
  // dropping the donut here (below) keeps every tab in the same rough
  // height range, and anchoring to the card's top means whatever's left
  // over is reached by a normal, expected scroll instead of an unpredictable
  // partial one. Skipped on first mount so loading the page doesn't itself
  // trigger a scroll.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  return (
    <Card ref={cardRef}>
      <CardHeader>
        <div ref={containerRef} className="relative isolate flex w-fit items-center gap-[3px] rounded-lg bg-muted p-[3px]">
          <SlidingIndicator activeKey={active} containerRef={containerRef} className="-z-10 rounded-md bg-background shadow-sm" />
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              data-key={t.key}
              onClick={() => setActive(t.key)}
              className={cn(
                "relative rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                active === t.key ? "text-foreground" : "text-foreground/60 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {active === "heatmap" && <DailySpendHeatmap days={heatmapDays} />}
        {active === "weekday" && <WeekdayPatternChart data={weekdayPattern} />}
        {active === "payment" && <CategoryBreakdown rows={paymentRows} />}
      </CardContent>
    </Card>
  );
}
