"use client";

import { useRef } from "react";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { cn } from "@/lib/utils";

export type EntryType = "expense" | "income";

const OPTIONS: { key: EntryType; label: string }[] = [
  { key: "expense", label: "支出" },
  { key: "income", label: "收入" },
];

// 支出/收入 everywhere a form asks for it — the same filled, sliding toggle
// as the home page's category tabs, not a dropdown in some forms and a
// toggle in others. Pass `name` when the form is submitted as FormData.
export function TypeToggle({
  value,
  onChange,
  name,
  className,
}: {
  value: EntryType;
  onChange: (type: EntryType) => void;
  name?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="類型"
      className={cn("relative isolate flex h-9 items-center gap-1 rounded-lg bg-muted p-1", className)}
    >
      <SlidingIndicator
        activeKey={value}
        containerRef={containerRef}
        className="-z-10 rounded-md bg-primary shadow-[0_4px_10px_-4px_var(--primary)]"
      />
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          data-key={o.key}
          onClick={() => value !== o.key && onChange(o.key)}
          className={cn(
            "flex h-full flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors",
            value === o.key ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
