"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { BearIllustration } from "@/components/bear-illustration";

type Phase = "initial" | "slow" | "verySlow";

const SLOW_MS = 3000;
const VERY_SLOW_MS = 10000;

// `performance.now()` is relative to navigation start, not to whenever this
// component happens to mount — on a slow connection the JS bundle itself
// can take several seconds to load and hydrate, so timing from mount alone
// would under-count real elapsed wait time and delay these messages past
// the point they're most needed. Computed as the lazy `useState` initializer
// (not inside an effect) so it reflects reality on the very first render,
// including a late hydration jumping straight to "slow"/"verySlow" instead
// of restarting the clock.
function initialPhase(): Phase {
  if (typeof window === "undefined") return "initial";
  const elapsed = performance.now();
  if (elapsed >= VERY_SLOW_MS) return "verySlow";
  if (elapsed >= SLOW_MS) return "slow";
  return "initial";
}

// Root-level loading boundary — fires on a genuinely cold start (before
// Clerk auth resolves and the first byte of any page streams down), which
// is the one moment (app)/loading.tsx's skeleton can't cover since the app
// shell (nav, FAB) doesn't exist yet at that point. Without this, a slow
// network/cold serverless function left the screen blank long enough that
// a user reported it looking frozen/crashed ("懷疑是不是當機") rather than
// just loading — this gives that wait a visible, branded heartbeat instead
// of nothing.
//
// Deliberately NOT a full-bleed splash image (it used to be one, backed by
// bear-loading-splash.webp) — BearSplashScreen (mounted in the root layout)
// already plays its own ~2s ceremony on every cold load, on a fixed timer
// independent of whether this fallback is still showing. On a slow load
// that outlasts that ceremony, having this ALSO be a full-screen bear+
// wordmark image meant the user saw two different splash images back to
// back once the first one's timer ran out and this one was still
// underneath, still legitimately waiting. Staying small/plain here removes
// that overlap — this reads unambiguously as "still loading", never as a
// second opening ceremony.
export default function RootLoading() {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const containerRef = useRef<HTMLDivElement>(null);

  // Staggered entrance instead of everything appearing at once — makes this
  // read as a deliberate moment rather than a flat static screen, however
  // briefly it's actually visible. Doesn't add any wait time: it's a
  // ~0.5s choreography on elements that were going to render immediately
  // anyway, not a delay gating when the real content underneath can take
  // over.
  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.from(containerRef.current.children, {
        opacity: 0,
        y: 10,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.15,
      });
    },
    { scope: containerRef },
  );

  useEffect(() => {
    const elapsed = performance.now();
    const slowTimer = setTimeout(() => setPhase("slow"), Math.max(0, SLOW_MS - elapsed));
    const verySlowTimer = setTimeout(() => setPhase("verySlow"), Math.max(0, VERY_SLOW_MS - elapsed));
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(verySlowTimer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center"
    >
      <BearIllustration name="welcome" size={80} />

      <p className="text-sm font-medium text-muted-foreground">
        {phase === "initial" && "正在整理你的帳本…"}
        {phase === "slow" && "還在讀取，請再稍候一下…"}
        {phase === "verySlow" && "載入時間比預期久"}
      </p>

      {phase !== "verySlow" && (
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full w-1/3 rounded-full bg-[linear-gradient(90deg,oklch(0.85_0.1_40),var(--primary))]"
            style={{ animation: "splash-progress-slide 1.1s ease-in-out infinite" }}
          />
        </div>
      )}

      {phase === "verySlow" && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          重新整理
        </button>
      )}
    </div>
  );
}
