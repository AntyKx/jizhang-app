"use client";

import { useEffect, useRef, useState } from "react";

// True split pane, not just a sticky header — with a normal page-scroll +
// sticky header, the whole page is still one scroll gesture, so a swipe
// that starts over the calendar grid just scrolls the page (the grid stays
// visually pinned, but the *gesture* doesn't feel scoped to the detail
// list below it). The outer pane (month grid vs. everything below it) is
// fixed to the viewport with its own top/bottom offsets — that lets the
// browser compute its height directly (viewport height minus those two
// offsets), rather than us trying to reproduce that arithmetic ourselves
// via 100dvh, which came out a bit tall on a real phone (leftover blank
// space at the bottom) since dvh doesn't track 1:1 with what's actually
// visible once the page can no longer scroll to reveal/hide browser
// chrome.
//
// Inside that pane, dateRow (the selected day + its total) gets the same
// treatment one level down: it's normal-flow content (shrink-0), and only
// `list` — a second, nested overflow-y-auto region — actually scrolls.
// Since the outer pane already has a real, CSS-computed height (from its
// own top/bottom), this inner split can just use plain flexbox
// (flex-1 + min-h-0), no second measurement needed.
//
// No JS body-scroll-lock here (there used to be one, forcing body to
// position:fixed) — it was a safety net from when the pane's height was
// only an estimate and could leave a few px of real page overflow. Now
// that the pane is `position:fixed` with explicit top+bottom, it's
// removed from normal document flow entirely and can't make the page
// taller than the header's own (short) natural height, so there's
// nothing left to scroll and nothing to lock. The lock itself turned out
// to be actively harmful on a real device — it left a large unexplained
// gap under the bottom nav (locking body's own box appears to disrupt
// how iOS resolves the fixed bottom nav's env(safe-area-inset-bottom)
// padding), which is worse than the problem it was guarding against.
export function CalendarScrollPane({
  header,
  dateRow,
  list,
}: {
  header: React.ReactNode;
  dateRow: React.ReactNode;
  list: React.ReactNode;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    // ResizeObserver (not a one-off measurement) so switching months — a
    // 5-row vs. 6-row grid changes the header's own height, with this
    // same client component instance staying mounted across that client-
    // side navigation — keeps the measurement correct.
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
    <>
      {/* touch-none — a drag starting on the grid shouldn't pan anything
          (this element has nothing to scroll itself, but without this a
          drag here can still bubble up and move the page/body instead of
          being scoped to the detail pane below, per the user's report).
          Taps (month prev/next, picking a day) are unaffected — touch-
          action only governs drag/pan gestures, not simple taps. */}
      <div ref={headerRef} className="touch-none">
        {header}
      </div>
      <div
        // Fixed to the viewport, not a normal-flow flex child — see the
        // file-level comment. left/right + mx-auto + max-w-md + px-4
        // reproduce (app)/layout.tsx's <main> centering/padding, since a
        // fixed element positions against the viewport directly and
        // doesn't inherit that from its actual DOM ancestors. flex-col
        // itself doesn't scroll (dateRow is touch-none, same reasoning as
        // the grid above) — only the nested list div below does.
        className="fixed inset-x-0 mx-auto flex w-full max-w-md flex-col px-4"
        style={
          headerBottom != null
            ? { top: headerBottom, bottom: "calc(6rem + env(safe-area-inset-bottom))" }
            : { visibility: "hidden" }
        }
      >
        <div className="touch-none pt-2">{dateRow}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{list}</div>
      </div>
    </>
  );
}
