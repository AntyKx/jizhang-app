"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

export function CountUpNumber({
  value,
  duration = 0.8,
  className,
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const displayedRef = useRef(0);

  // Plain useEffect (not useGSAP, not useLayoutEffect) — see
  // sliding-indicator.tsx for why: needs the tween's result to persist
  // across `value` changes instead of reverting each time, and needs to
  // fire reliably after hydration settles on the very first mount.
  useEffect(() => {
    if (!spanRef.current) return;
    const state = { val: displayedRef.current };
    const tween = gsap.to(state, {
      val: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        displayedRef.current = state.val;
        if (spanRef.current) {
          spanRef.current.textContent = `${prefix}${Math.round(state.val).toLocaleString("zh-TW")}${suffix}`;
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, duration, prefix, suffix]);

  return (
    <span ref={spanRef} className={cn("tabular-nums", className)}>
      {prefix}
      {Math.round(value).toLocaleString("zh-TW")}
      {suffix}
    </span>
  );
}
