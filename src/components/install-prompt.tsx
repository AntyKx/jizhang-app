"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "jizhang-app-install-hint-dismissed";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  const hasBottomNav = !pathname?.startsWith("/sign-in") && !pathname?.startsWith("/sign-up");

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(isIOS && !isStandalone && !dismissed);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div
      className={`fixed inset-x-0 z-40 mx-auto w-full max-w-md p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
        hasBottomNav ? "bottom-[calc(4rem+env(safe-area-inset-bottom))]" : "bottom-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm shadow-lg">
        <p className="flex-1 text-muted-foreground">
          點下方分享鍵 <Share className="inline h-4 w-4 align-text-bottom" />{" "}
          →「加入主畫面」，把小熊記帳本加到手機桌面
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="關閉"
          className="text-muted-foreground/60 hover:text-foreground shrink-0 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
