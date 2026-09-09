"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Single branded scene (small-bear-on-desk + wordmark) — replaced the
// earlier random-pick-of-10 rotation 2026-09-09, so every cold load shows
// the same art instead of a different scene each time.
const SPLASH_FILE = "welcome.webp";

const HOLD_MS = 1450;
const EXIT_MS = 600;
const SESSION_KEY = "jizhang-splash-played";

type Phase = "enter" | "hold" | "exit" | "gone";

// True only the very first time this is called in the current tab's
// lifetime — every call after that returns false, no matter what caused
// this component to mount again. Added after a user reported seeing two
// splash plays back to back on a plain already-logged-in refresh/reopen —
// neither of the two mechanisms checked against (the /sign-in redirect
// chain, UpdateChecker's version-mismatch auto-reload) turned out to be
// it, and it wasn't reproducible from reading the code alone. Rather than
// keep guessing at which exact Next.js/browser-level quirk re-evaluates
// the root layout more than once for what the user experienced as one
// "open the app" action, sessionStorage guarantees the user-visible
// symptom is fixed regardless of the cause — it survives however many
// times that turns out to happen within the same tab.
function claimSplashTurn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return false;
    sessionStorage.setItem(SESSION_KEY, "1");
    return true;
  } catch {
    // Storage unavailable (private browsing, quota, disabled) — fail open
    // rather than throw; worst case is the old double-play behavior for
    // that one user, not a broken app.
    return true;
  }
}

// Ported from trip-planner's SplashScreen.tsx (see 2026-08-04 discussion —
// user liked that app's opening ceremony and asked to bring the same
// technique here). Two things make this a "free" ceremony instead of added
// friction on an app that gets reopened many times a day:
// 1. `pointer-events-none` — the overlay is purely visual. A tap during the
//    hold/exit phases passes straight through to whatever's already
//    rendered underneath, so an impatient user isn't actually blocked.
// 2. Fixed enter/hold/exit timing, completely independent of real data
//    loading (that's what src/app/loading.tsx is for) — this never gates
//    or delays when the real page becomes usable, it's a decorative layer
//    on top of whatever's already streaming in behind it.
// Mount this once in the root layout, not per-page — App Router doesn't
// remount a shared layout on client-side navigation, so it only plays on
// an actual cold load (refresh, PWA launch, first visit), never when
// tapping between tabs.
export function BearSplashScreen() {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");
  // /sign-in and /sign-up are their own full page load (root layout mounts
  // fresh) separate from the app content that follows once auth succeeds —
  // skipping it there means the one real playback happens on the way into
  // actual app content, not a login form nobody lingers on. This alone
  // decides whether the splash markup exists at all, and it MUST be true
  // on both the server-rendered HTML and the client's first hydration pass
  // — `pathname` is available identically in both, so that's safe. The
  // sessionStorage check used to be folded into this same value, but
  // sessionStorage doesn't exist during SSR (see claimSplashTurn below),
  // so the server always rendered nothing while the client's hydration
  // pass could still compute "play" — a hydration mismatch that showed up
  // as the real page flashing first, with the splash only popping in once
  // hydration caught up. Moved to the effect below instead, where it can
  // only ever change things after the first paint has already matched.
  const shouldRender = !isAuthPage;
  const [phase, setPhase] = useState<Phase>("enter");

  useEffect(() => {
    if (!shouldRender) return;
    if (!claimSplashTurn()) {
      // Already played once in this tab — skip straight to hidden instead
      // of replaying the full ~2s ceremony. The first frame (rendered
      // above, before this effect runs) briefly shows the same splash art
      // either way, so this reads as at most a single-frame flicker, not a
      // second full playback. Deferred via rAF rather than called directly
      // here — same reason the "hold" transition below is too, setState
      // synchronously in an effect body triggers cascading renders.
      const raf = requestAnimationFrame(() => setPhase("gone"));
      return () => cancelAnimationFrame(raf);
    }
    // Starts in "enter" (image scaled up slightly) so there's an actual
    // starting state to settle from — flipping to "hold" a frame later is
    // what makes that settle visibly animate instead of snapping straight
    // to rest.
    const raf = requestAnimationFrame(() => setPhase("hold"));
    const exitTimer = setTimeout(() => setPhase("exit"), HOLD_MS);
    const goneTimer = setTimeout(() => setPhase("gone"), HOLD_MS + EXIT_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(exitTimer);
      clearTimeout(goneTimer);
    };
    // Deliberately run-once-on-mount, not reactive to `shouldRender`/pathname
    // changing later — if this instance ever survived a client-side nav off
    // /sign-in (it normally doesn't; see the file-level comment on why this
    // only mounts once per real page load), re-running the whole
    // enter/hold/exit cycle mid-session would be wrong, not a fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shouldRender || phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[70] overflow-hidden bg-background transition-opacity motion-reduce:transition-none ${
        phase === "exit" ? "opacity-0 duration-500 ease-in" : "opacity-100 duration-700 ease-out"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed
          full-bleed splash doesn't benefit from next/image's responsive
          sizing machinery, and this needs to paint the instant the layout
          mounts, before any data fetching. */}
      <img
        src={`/images/bears/splash/${SPLASH_FILE}`}
        alt=""
        className={`h-full w-full object-cover transition-transform duration-[1400ms] ease-out motion-reduce:transition-none ${
          phase === "enter" ? "scale-105" : "scale-100"
        }`}
      />
      {/* Light sweep across the artwork while it holds — only during
          "hold" so it never plays partway through the fade-out. */}
      {phase === "hold" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-soft-light motion-reduce:hidden"
          style={{
            background:
              "linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
            backgroundSize: "250% 250%",
            animation: "splash-sheen 2.2s ease-in-out 1",
          }}
        />
      )}
    </div>
  );
}
