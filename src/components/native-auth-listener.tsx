"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { toast } from "sonner";

function extractTicket(url: string): string | null {
  try {
    return new URL(url).searchParams.get("ticket");
  } catch {
    return null;
  }
}

// Catches the bearledger://auth-callback deep link that src/app/native-auth-callback
// redirects to once a Chrome-Custom-Tabs sign-in (Google OAuth, or any sign-in that
// went through that handoff — see MainActivity's shouldOverrideUrlLoading override)
// has minted a ticket. Completes the session inside this WebView with Clerk's
// "ticket" strategy so the app doesn't need its own cookie in that browser context.
export function NativeAuthListener() {
  const { signIn } = useSignIn();
  const router = useRouter();
  // Read through refs inside the listeners below so registration only needs
  // to happen once on mount, not every render signIn's identity changes.
  // Synced in an effect (not during render) per the rules of hooks.
  const signInRef = useRef(signIn);
  const routerRef = useRef(router);
  useEffect(() => {
    signInRef.current = signIn;
    routerRef.current = router;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function consumeTicket(ticket: string) {
      const currentSignIn = signInRef.current;
      const currentRouter = routerRef.current;

      function fail() {
        toast.error("登入逾時或發生錯誤，請重新登入");
        currentRouter.replace("/sign-in");
      }

      try {
        const { error: ticketError } = await currentSignIn.ticket({ ticket });
        if (ticketError || currentSignIn.status !== "complete") {
          fail();
          return;
        }
        const { error: finalizeError } = await currentSignIn.finalize();
        if (finalizeError) {
          fail();
          return;
        }
        currentRouter.replace("/record");
      } catch {
        fail();
      }
    }

    let cancelled = false;

    // Cold start — the gap the previous version of this file had: Android
    // killed the app while the user was off in Chrome Custom Tabs completing
    // Google's sign-in (a full OAuth+2FA flow can take a while, and a
    // backgrounded WebView app is exactly what Android reclaims memory from
    // first). The deep link then arrives as this activity's *launch* intent
    // rather than a live appUrlOpen event, so it needs its own check.
    App.getLaunchUrl().then((launch) => {
      if (cancelled || !launch) return;
      const ticket = extractTicket(launch.url);
      if (ticket) consumeTicket(ticket);
    });

    let removeListener: (() => void) | undefined;
    App.addListener("appUrlOpen", ({ url }) => {
      const ticket = extractTicket(url);
      if (ticket) consumeTicket(ticket);
    }).then((handle) => {
      if (cancelled) {
        handle.remove();
      } else {
        removeListener = () => handle.remove();
      }
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  return null;
}
