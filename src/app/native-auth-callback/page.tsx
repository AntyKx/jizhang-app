"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// Lands here (inside Chrome Custom Tabs, not the app's WebView) right after
// Google/email sign-in finishes — see MainActivity's shouldOverrideUrlLoading
// override and the sign-in/sign-up pages' forceRedirectUrl when native. This
// page's only job is to mint a portable sign-in token for the session that
// just landed here and hand it to the WebView via a bearledger:// deep link
// (caught by @capacitor/app's appUrlOpen listener, see src/components/native-auth-listener.tsx).
export default function NativeAuthCallbackPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/native-auth-ticket", { method: "POST" });
        if (!res.ok) throw new Error("ticket request failed");
        const { token } = (await res.json()) as { token: string };
        if (cancelled) return;
        window.location.href = `bearledger://auth-callback?ticket=${encodeURIComponent(token)}`;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {failed ? (
        <>
          <p className="text-sm text-muted-foreground">登入完成，但無法自動返回小熊記帳本 App。</p>
          <Link href="/record" className="text-sm font-medium text-primary underline">
            改用瀏覽器繼續
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">登入中，正在返回小熊記帳本…</p>
        </>
      )}
    </div>
  );
}
