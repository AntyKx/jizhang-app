"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

// Goal progress as a round jar filling with liquid in the theme's primary
// color. Two offset waves drift sideways forever (CSS, see .jz-wave in
// globals.css); the level eases to `pct` on mount and on every change.
const WAVE = (() => {
  // 4 periods of 50 units across 200 wide, so shifting by 100 loops seamlessly.
  let d = "M0 0 Q12.5 -5 25 0";
  for (let x = 50; x <= 200; x += 25) d += ` T${x} 0`;
  return `${d} V140 H0 Z`;
})();

export function LiquidJar({
  pct,
  size = 72,
  className,
}: {
  pct: number;
  size?: number;
  className?: string;
}) {
  const id = useId();
  const clip = `jar-${id}`;
  const clamped = Math.max(0, Math.min(100, pct));
  // Start empty and fill up after mount, so the jar visibly pours.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(t);
  }, [clamped]);

  // Inner circle spans y 6..94; full sits a bit above so no trough shows.
  const level = shown >= 100 ? -6 : 94 - shown * 0.88;
  const done = clamped >= 100;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={`已完成 ${Math.round(clamped)}%`}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="44" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="44" fill="var(--muted)" />
      <g clipPath={`url(#${clip})`}>
        <g style={{ transform: `translateY(${level}px)`, transition: "transform 1.4s cubic-bezier(.25,.8,.3,1)" }}>
          <path
            d={WAVE}
            className="jz-wave jz-wave-back"
            fill="color-mix(in oklch, var(--primary) 45%, white)"
          />
          <path d={WAVE} className="jz-wave" fill="var(--primary)" transform="translate(0 3)" />
        </g>
        {shown > 8 && (
          <g fill="white" opacity="0.55">
            <circle className="jz-bubble" cx="34" cy="90" r="2.2" />
            <circle className="jz-bubble" cx="58" cy="92" r="1.6" style={{ animationDelay: "1.1s" }} />
            <circle className="jz-bubble" cx="70" cy="88" r="1.9" style={{ animationDelay: "2.2s" }} />
          </g>
        )}
        {/* Glass highlight. */}
        <path d="M24 36 A30 30 0 0 1 40 18" stroke="white" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="color-mix(in oklch, var(--primary) 35%, transparent)"
        strokeWidth="3"
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={done ? 20 : 22}
        fontWeight="800"
        fill="var(--foreground)"
        stroke="var(--card)"
        strokeWidth="5"
        strokeLinejoin="round"
        paintOrder="stroke"
        className="tabular-nums"
      >
        {done ? "達成" : `${Math.round(shown)}%`}
      </text>
    </svg>
  );
}
