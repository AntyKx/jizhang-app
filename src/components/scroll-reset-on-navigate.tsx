"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Every navigation lands at the top of its own new page, full stop — not
// relying on the browser/Next's built-in scroll restoration, which is
// usually right but real-device testing (iOS Safari/PWA) turned up cases
// after switching bottom-nav tabs where the next page rendered as if still
// scrolled by the previous page's amount, squashing its own header out of
// view. A page's height should only ever be its own natural height, never
// inherited from wherever the last page's scroll happened to land — this
// is an unconditional safety net for that, independent of whatever the
// platform-specific root cause turns out to be.
//
// Mounted once in (app)/layout.tsx, not per-page — {children} there is
// what actually swaps on navigation, so this only needs one instance
// watching the pathname, not one per route.
export function ScrollResetOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
