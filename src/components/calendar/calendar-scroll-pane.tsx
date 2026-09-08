"use client";

import { useEffect, useRef, useState } from "react";

// True split pane, not just a sticky header — with a normal page-scroll +
// sticky header, the whole page is still one scroll gesture, so a swipe
// that starts over the calendar grid just scrolls the page (the grid stays
// visually pinned, but the *gesture* doesn't feel scoped to the detail
// list below it). This measures where the header actually ends and gives
// the detail pane its own bounded, independently-scrollable box instead,
// so a touch on the grid does nothing and only the detail list responds.
export function CalendarScrollPane({
  header,
  detail,
}: {
  header: React.ReactNode;
  detail: React.ReactNode;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  useEffect(() => {
    // Hard lock, not just "make the math add up to zero overflow" — the
    // headerBottom-based height below is still an estimate (address-bar
    // show/hide, safe-area quirks, PWA vs. browser-tab chrome all shift it
    // a few px in practice), and on a real phone a few px of residual
    // overflow is enough for the whole page to still drag/bounce. Pinning
    // body in place is the standard cross-browser modal-scroll-lock
    // recipe and guarantees the page can't move regardless of how exact
    // that estimate turns out to be.
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    // Where the pane should start is the header's bottom edge, not the
    // wrapper's top — measuring the wrapper's top gave the same (roughly
    // constant) value regardless of the header's actual rendered height,
    // so the pane's calculated height silently ignored how tall the
    // header really was and either clipped into it or left it short.
    // ResizeObserver (not a one-off measure + window resize listener) so
    // switching months — a 5-row vs. 6-row grid changes the header's own
    // height, with this same client component instance staying mounted
    // across that client-side navigation — keeps the measurement correct.
    const measure = () => setHeaderBottom(el.getBoundingClientRect().bottom);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div className="flex flex-col">
      <div ref={headerRef} className="shrink-0">
        {header}
      </div>
      <div
        // No flex-1 here — `flex: 1 1 0%` makes flex-basis 0%, which then
        // wins over the explicit inline height below for this flex item's
        // sizing, so the pane silently grows to fit its content instead of
        // clipping/scrolling at the computed height. The inline height is
        // the actual sizing mechanism; this is a plain (non-growing) flex
        // item that just happens to get an explicit height.
        className="overflow-y-auto overscroll-contain"
        // Height comes from where this pane actually starts (measured,
        // since the header above it isn't a fixed size) down to the
        // viewport bottom, minus the same bottom-nav/FAB reservation
        // (app)/layout.tsx's <main> already carries in its own padding.
        style={
          headerBottom != null
            ? { height: `calc(100dvh - ${headerBottom}px - 6rem - env(safe-area-inset-bottom))` }
            : undefined
        }
      >
        {detail}
      </div>
    </div>
  );
}
