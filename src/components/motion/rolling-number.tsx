"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Odometer-style number: every digit is a 0-9 column that slides to its
// value. Columns are keyed from the right, so a new leading digit slides in
// without the others jumping. Starts at 0 and rolls up on mount.
export function RollingNumber({
  value,
  className,
  duration = 1100,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(t);
  }, [value]);

  const target = Math.round(Math.abs(value)).toLocaleString("zh-TW");
  const current = shown === null ? target.replace(/\d/g, "0") : Math.round(Math.abs(shown)).toLocaleString("zh-TW");
  const chars = current.split("");

  return (
    <span className={cn("inline-flex tabular-nums", className)} aria-label={`${value < 0 ? "-" : ""}${target}`}>
      {value < 0 && <span aria-hidden>-</span>}
      {chars.map((c, i) => {
        const key = chars.length - i;
        if (!/\d/.test(c)) {
          return (
            <span key={`s${key}`} aria-hidden>
              {c}
            </span>
          );
        }
        const d = Number(c);
        return (
          <span key={key} aria-hidden className="relative inline-block h-[1.15em] overflow-hidden leading-[1.15em]">
            <span className="invisible">0</span>
            <span
              className="absolute inset-x-0 top-0 flex flex-col"
              style={{
                transform: `translateY(${-d * 1.15}em)`,
                transition: `transform ${duration + (chars.length - i) * 60}ms cubic-bezier(.2,.9,.25,1)`,
              }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
