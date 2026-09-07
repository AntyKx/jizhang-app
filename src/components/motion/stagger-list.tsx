"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = containerRef.current;
      const count = el?.children.length ?? 0;
      if (!el || count === 0) return;
      // Cap the total spread so long lists (e.g. 200 transactions) still
      // finish settling in well under a second instead of stair-stepping in
      // one row every 45ms.
      const each = Math.min(0.045, 0.4 / count);
      const tween = gsap.from(el.children, {
        opacity: 0,
        y: 12,
        stagger: each,
        duration: 0.4,
        ease: "power2.out",
        clearProps: "opacity,transform",
      });
      // Safety net — if the tab gets backgrounded or the browser throttles
      // rAF hard enough mid-animation, GSAP's ticker just stops advancing:
      // no error, no completion callback, and whatever hadn't animated in
      // yet (opacity still 0) stays permanently invisible. That's exactly
      // what made the calendar's later day cells disappear. Forcing the
      // tween to its end state after a bounded timeout turns "stuck
      // invisible forever" into "shows up a little late" instead.
      const timeout = setTimeout(() => tween.progress(1), tween.totalDuration() * 1000 + 500);
      return () => clearTimeout(timeout);
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
