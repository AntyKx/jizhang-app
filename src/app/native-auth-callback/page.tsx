"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { ReturnToAppButton } from "@/components/return-to-app-button";

// Lands here (inside Chrome Custom Tabs, not the app's WebView) right after
// Google/email sign-in finishes — see MainActivity's shouldOverrideUrlLoading
// override and the sign-in/sign-up pages' forceRedirectUrl when native. This
// page's only job is to mint a portable sign-in token for the session that
// just landed here and hand it to the WebView via a verified App Link
// (src/app/native-auth-return, with a bearledger:// fallback), caught by
// @capacitor/app's appUrlOpen listener — see src/components/native-auth-listener.tsx.
const NATIVE_AUTH_RETURN_URL = "https://bearledger.app/native-auth-return";

export default function NativeAuthCallbackPage() {
  const [failed, setFailed] = useState(false);
  const [appUrl, setAppUrl] = useState<string | null>(null);

  useEffect(() => {
    // Inside the app's own WebView (email/password sign-in never leaves it),
    // the session already lives right here — there's nothing to hand back.
    // Minting a ticket anyway made the listener try to sign in a second time
    // on top of the live session, which Clerk rejects, so every in-app
    // email/password sign-in ended on "登入逾時或發生錯誤" and bounced back to
    // /sign-in. The ticket handoff is only for Chrome Custom Tabs (Google
    // OAuth), where Capacitor isn't present.
    if (Capacitor.isNativePlatform()) {
      window.location.replace("/record");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/native-auth-ticket", { method: "POST" });
        if (!res.ok) throw new Error("ticket request failed");
        const { token } = (await res.json()) as { token: string };
        if (cancelled) return;
        // Chrome only lets a page open another app from a real user tap, so
        // the automatic hand-off below can be silently blocked. This button
        // is the guaranteed path: a tap on a bearledger:// link always
        // reaches the app.
        setAppUrl(`bearledger://auth-callback?ticket=${encodeURIComponent(token)}`);
        // Different origin from this page on purpose — Chrome is far more
        // willing to hand a cross-origin navigation to a verified App Link
        // than a same-origin one. That page falls back to bearledger:// if
        // the browser keeps the navigation anyway.
        window.location.href = `${NATIVE_AUTH_RETURN_URL}#ticket=${encodeURIComponent(token)}`;
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
          {appUrl && <ReturnToAppButton href={appUrl} />}
        </>
      )}
    </div>
  );
}
