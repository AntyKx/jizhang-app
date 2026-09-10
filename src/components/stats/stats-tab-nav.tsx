"use client";

import { useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";

// Named after the question each tab answers, not the kind of chart it
// holds — "日常分析 / 進階分析" said nothing about where to look for
// "我錢花去哪" vs "我存得夠快嗎", so both got renamed when the report set
// was trimmed and rebalanced.
const tabs = [
  { href: "/stats", label: "總覽" },
  { href: "/stats/daily", label: "支出分析" },
  { href: "/stats/advanced", label: "趨勢" },
  { href: "/stats/budgets-goals", label: "預算目標" },
] as const;

export function StatsTabNav({ active }: { active: (typeof tabs)[number]["href"] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative isolate flex w-fit items-center gap-[3px] rounded-lg bg-muted p-[3px]">
      <SlidingIndicator
        activeKey={active}
        containerRef={containerRef}
        className="-z-10 rounded-md bg-background shadow-sm"
      />
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          data-key={tab.href}
          className={cn(
            "relative rounded-md px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-colors",
            active === tab.href ? "text-foreground" : "text-foreground/60 hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
