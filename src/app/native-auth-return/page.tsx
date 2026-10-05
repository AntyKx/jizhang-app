"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Verified Android App Link target (https://bearledger.app/native-auth-return,
// see public/.well-known/assetlinks.json and AndroidManifest.xml's autoVerify
// filter). When Android hands the URL straight to the app, this page never
// renders — the app's appUrlOpen listener reads the ticket off the URL itself
// (src/components/native-auth-listener.tsx). It only renders when the browser
// kept the navigation instead (link not yet verified, older app build, Chrome
// declining to leave the Custom Tab), and then falls back to the old
// bearledger:// custom-scheme handoff so sign-in still completes.
//
// The ticket rides in the fragment, not the query string, so it never reaches
// the server or its request logs.
export default function NativeAuthReturnPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get("ticket");
    if (!ticket) {
      // Deferred so the fallback UI isn't a synchronous in-effect re-render.
      queueMicrotask(() => setFailed(true));
      return;
    }
    window.location.replace(`bearledger://auth-callback?ticket=${encodeURIComponent(ticket)}`);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {failed ? (
        <>
          <p className="text-sm text-muted-foreground">登入完成，但無法自動返回小熊記帳本 App。</p>
          <a href="https://jizhang.bearledger.app/record" className="text-sm font-medium text-primary underline">
            改用瀏覽器繼續
          </a>
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
