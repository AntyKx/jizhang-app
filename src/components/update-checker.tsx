"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
// Route changes also trigger a check, throttled to this.
const NAV_CHECK_MIN_GAP_MS = 30 * 1000;
const COUNTDOWN_MS = 2200;

function isTypingInField(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

// Polls a small version endpoint instead of using a service worker: a new
// deploy bakes a fresh NEXT_PUBLIC_BUILD_ID into the client bundle at build
// time, and this compares it against whatever the server currently reports.
export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);
  const pathname = usePathname();
  const lastCheckRef = useRef(0);
  const checkRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    async function check() {
      lastCheckRef.current = Date.now();
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = (await res.json()) as { buildId?: string };
        const currentBuildId = process.env.NEXT_PUBLIC_BUILD_ID;
        if (!cancelled && data.buildId && currentBuildId && data.buildId !== currentBuildId) {
          setUpdateAvailable(true);
        }
      } catch {
        // network hiccup — ignore, the next interval/visibility check retries
      }
    }

    checkRef.current = check;
    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // A PWA left open in the foreground used to keep running the old bundle
  // for up to CHECK_INTERVAL_MS after a deploy — long enough for someone to
  // use a new feature against old client code (e.g. a new row type
  // rendering as something else). Moving to another page is a natural,
  // cheap moment to look again.
  useEffect(() => {
    if (Date.now() - lastCheckRef.current < NAV_CHECK_MIN_GAP_MS) return;
    checkRef.current();
  }, [pathname]);

  useEffect(() => {
    if (!updateAvailable) return;

    // Deliberately depends only on `updateAvailable` (which only ever flips
    // false -> true once). Calling setReloading(true) below used to also be
    // in this effect's deps, which made React re-run the effect and fire
    // this same cleanup right after scheduling the reload timer — clearing
    // it before it could ever call window.location.reload(). The banner
    // would show "即將重新整理" and then just sit there forever.
    let cancelled = false;
    const tryReload = () => {
      if (cancelled) return;
      if (isTypingInField()) {
        setTimeout(tryReload, 3000);
        return;
      }
      setReloading(true);
      setTimeout(() => {
        if (!cancelled) window.location.reload();
      }, COUNTDOWN_MS);
    };
    tryReload();

    return () => {
      cancelled = true;
    };
  }, [updateAvailable]);

  if (!reloading) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-primary px-4 py-2 text-center text-sm text-primary-foreground">
      有新版本，即將重新整理…
    </div>
  );
}
