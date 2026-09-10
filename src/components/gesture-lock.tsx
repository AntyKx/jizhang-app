"use client";

import { useEffect } from "react";

// CSS alone (touch-action: pan-x pan-y on <html>, see globals.css) is
// supposed to be enough to block pinch-zoom per spec, but real-device
// testing kept finding it still possible — WebKit's touch-action support
// for multi-touch gestures has known gaps across iOS/PWA-webview versions,
// and this is a case CSS-only can't be verified against from here (see this
// project's repeated "can't reproduce mobile-only gesture bugs on desktop"
// notes). Safari fires its own non-standard `gesturestart`/`gesturechange`
// events specifically for pinch — preventDefault on those is the same
// battle-tested technique sites used to block pinch-zoom before
// touch-action existed, so it's added here as a second, independent layer
// rather than replacing the CSS one. The multi-touch touchmove guard below
// is the same idea for non-Safari WebKit variants that don't fire
// gesturestart at all.
export function GestureLock() {
  useEffect(() => {
    function preventGesture(e: Event) {
      e.preventDefault();
    }
    function preventMultiTouchMove(e: TouchEvent) {
      if (e.touches.length > 1) e.preventDefault();
    }
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    document.addEventListener("touchmove", preventMultiTouchMove, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("touchmove", preventMultiTouchMove);
    };
  }, []);

  return null;
}
