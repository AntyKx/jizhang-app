"use client";

import { cn } from "@/lib/utils";

// Light/dark switch drawn as a sky: the sun slides across and turns into a
// moon, clouds drift away and stars come out.
export function DayNightSwitch({
  dark,
  onChange,
  className,
}: {
  dark: boolean;
  onChange: (dark: boolean) => void;
  className?: string;
}) {
  const ease = "duration-500 ease-[cubic-bezier(.5,1.5,.5,1)]";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="深色模式"
      onClick={() => onChange(!dark)}
      className={cn(
        "relative h-9 w-[4.25rem] shrink-0 overflow-hidden rounded-full transition-colors duration-500",
        "shadow-[inset_0_2px_5px_rgba(0,0,0,0.25)]",
        dark ? "bg-[#1f2a5c]" : "bg-[#7cc4f0]",
        className
      )}
    >
      {/* Stars */}
      {[
        [14, 9, 2],
        [24, 22, 1.5],
        [10, 24, 1.5],
        [30, 11, 1],
      ].map(([x, y, s], i) => (
        <span
          key={i}
          className={cn(
            "absolute rounded-full bg-white transition-all duration-500",
            dark ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
          style={{ left: x, top: y, width: s * 2, height: s * 2, transitionDelay: dark ? `${150 + i * 80}ms` : "0ms" }}
        />
      ))}
      {/* Clouds */}
      <span
        className={cn(
          "absolute top-[18px] right-[6px] h-3 w-7 rounded-full bg-white transition-all duration-500",
          "before:absolute before:-top-1.5 before:left-1.5 before:size-3.5 before:rounded-full before:bg-white",
          dark ? "translate-y-6 opacity-0" : "translate-y-0 opacity-95"
        )}
      />
      <span
        className={cn(
          "absolute top-[24px] right-[20px] h-2 w-5 rounded-full bg-white/80 transition-all duration-500",
          dark ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100"
        )}
      />
      {/* Sun → moon */}
      <span
        className={cn(
          "absolute top-1 left-1 size-7 overflow-hidden rounded-full transition-all",
          ease,
          dark
            ? "translate-x-8 bg-[#e8e6dc] shadow-[0_0_10px_rgba(255,255,255,0.45)]"
            : "translate-x-0 bg-[#f6c544] shadow-[0_0_0_4px_rgba(255,230,140,0.35),0_0_14px_rgba(255,200,60,0.7)]"
        )}
      >
        {/* Craters */}
        {[
          [6, 6, 7],
          [15, 14, 5],
          [7, 17, 4],
        ].map(([x, y, s], i) => (
          <span
            key={i}
            className={cn(
              "absolute rounded-full bg-[#c9c5b6] transition-opacity duration-300",
              dark ? "opacity-100 delay-200" : "opacity-0"
            )}
            style={{ left: x, top: y, width: s, height: s }}
          />
        ))}
      </span>
    </button>
  );
}
