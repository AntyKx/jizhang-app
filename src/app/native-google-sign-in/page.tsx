"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opened in Chrome Custom Tabs by MainActivity whenever the app's WebView
// tries to navigate to Google's OAuth page. The whole Google sign-in has to
// start *and* finish in the same browser: Clerk ties the OAuth callback to
// the client that created the sign-in, so a sign-in created in the WebView
// and completed in Chrome is rejected ("authorization_invalid"). This page
// starts a fresh Google sign-in right here in Chrome; once it completes,
// /api/native-auth-handoff hands the session back to the app with a ticket.
export default function NativeGoogleSignInPage() {
  const { signIn } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  // The automatic start occasionally stalls on a Custom Tab's very first
  // load; after a few seconds, offer a manual start (a real tap, which
  // Chrome also treats more permissively for the redirect to Google).
  const [showManual, setShowManual] = useState(false);

  const start = useCallback(async () => {
    try {
      // Chrome may still hold a session from an earlier sign-in (possibly a
      // different account) — clear it so the user picks the account now.
      if (isSignedIn) {
        await signOut({ redirectUrl: "/native-google-sign-in" });
        return;
      }
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: "/api/native-auth-handoff",
        redirectCallbackUrl: "/native-google-sign-in/sso-callback",
      });
      if (error) setFailed(true);
    } catch {
      setFailed(true);
    }
  }, [isSignedIn, signIn, signOut]);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    void start();
  }, [isLoaded, start]);

  useEffect(() => {
    const timer = setTimeout(() => setShowManual(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {failed ? (
        <p className="text-sm text-muted-foreground">無法開始 Google 登入，請關閉此頁後再試一次。</p>
      ) : (
        <>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">正在前往 Google 登入…</p>
        </>
      )}
      {(showManual || failed) && isLoaded && (
        <Button size="lg" className="mt-2 w-full max-w-xs" onClick={() => void start()}>
          前往 Google 登入
        </Button>
      )}
    </div>
  );
}
