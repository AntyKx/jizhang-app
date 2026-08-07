"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Decorative pill/underline that tweens to sit behind whichever sibling
 * inside `containerRef` has `data-key === activeKey`. The container must be
 * `position: relative` and contain the real interactive elements (links,
 * buttons) separately — this only renders the floating indicator.
 *
 * Uses a plain `useEffect` rather than `useGSAP` on purpose: this
 * indicator's position must persist and incrementally update across
 * `activeKey` changes, but `useGSAP`'s dependency-array mode reverts the
 * tween back to its pre-animation state on every dependency change, which
 * would snap the indicator back to invisible/zero-size right after moving
 * it. Plain `useLayoutEffect` was tried first but on the very first
 * hydration-mount `containerRef.current` isn't reliably populated yet by the
 * time it fires (works fine on every later update) — `useEffect` (which
 * fires strictly after paint, once hydration has fully settled) avoids that.
 */
export function SlidingIndicator({
  activeKey,
  containerRef,
  className,
}: {
  activeKey: string;
  containerRef: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;

    const reposition = (animate: boolean) => {
      const target = container.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
      if (!target) {
        gsap.set(indicator, { opacity: 0 });
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const props = {
        x: targetRect.left - containerRect.left,
        y: targetRect.top - containerRect.top,
        width: targetRect.width,
        height: targetRect.height,
        opacity: 1,
      };
      if (animate) gsap.to(indicator, { ...props, duration: 0.35, ease: "power3.out" });
      else gsap.set(indicator, props);
    };

    reposition(!isFirstRun.current);
    isFirstRun.current = false;

    const onResize = () => reposition(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeKey, containerRef]);

  return (
    <div
      ref={indicatorRef}
      aria-hidden
      className={className}
      style={{ position: "absolute", top: 0, left: 0, opacity: 0, pointerEvents: "none" }}
    />
  );
}
