"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { toast } from "sonner";

// Two shapes arrive here: the verified App Link
// https://bearledger.app/native-auth-return#ticket=… (ticket in the fragment)
// and the bearledger://auth-callback?ticket=… custom-scheme fallback.
function extractTicket(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") {
      if (parsed.hostname !== "bearledger.app" || parsed.pathname !== "/native-auth-return") return null;
      return new URLSearchParams(parsed.hash.slice(1)).get("ticket");
    }
    if (parsed.protocol === "bearledger:") return parsed.searchParams.get("ticket");
    return null;
  } catch {
    return null;
  }
}

// Tickets already handled in this app process. App.getLaunchUrl() keeps
// returning the deep link that cold-started the app for the life of the
// process, so every full page load after that (e.g. a Clerk handshake
// reload) would re-read the same, already-used ticket — bouncing a signed-in
// user to /record, or, if Clerk hadn't loaded yet, trying the spent ticket
// and showing the failure toast. sessionStorage survives those reloads.
const HANDLED_TICKETS_KEY = "native-auth-handled-tickets";

function markTicketHandled(ticket: string): boolean {
  try {
    const handled: string[] = JSON.parse(sessionStorage.getItem(HANDLED_TICKETS_KEY) ?? "[]");
    if (handled.includes(ticket)) return false;
    sessionStorage.setItem(HANDLED_TICKETS_KEY, JSON.stringify([...handled.slice(-4), ticket]));
    return true;
  } catch {
    return true;
  }
}

// Catches the auth-return deep link that src/app/native-auth-callback
// redirects to once a Chrome-Custom-Tabs sign-in (Google OAuth, or any sign-in that
// went through that handoff — see MainActivity's shouldOverrideUrlLoading override)
// has minted a ticket. Completes the session inside this WebView with Clerk's
// "ticket" strategy so the app doesn't need its own cookie in that browser context.
export function NativeAuthListener() {
  const { signIn } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  // Read through refs inside the listeners below so registration only needs
  // to happen once on mount, not every render signIn's identity changes.
  // Synced in an effect (not during render) per the rules of hooks.
  const signInRef = useRef(signIn);
  const routerRef = useRef(router);
  const isSignedInRef = useRef(isSignedIn);
  // A ticket that arrives before Clerk has loaded (cold start) waits here
  // until it has — a ticket sign-in attempted on an unloaded Clerk fails.
  const pendingTicketRef = useRef<string | null>(null);
  const consumeRef = useRef<((ticket: string) => void) | null>(null);
  useEffect(() => {
    signInRef.current = signIn;
    routerRef.current = router;
    isSignedInRef.current = isSignedIn;
  });

  useEffect(() => {
    if (!isLoaded || !pendingTicketRef.current || !consumeRef.current) return;
    const ticket = pendingTicketRef.current;
    pendingTicketRef.current = null;
    consumeRef.current(ticket);
  }, [isLoaded]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function consumeTicket(ticket: string) {
      if (!markTicketHandled(ticket)) return;
      const currentSignIn = signInRef.current;
      const currentRouter = routerRef.current;

      // A session already in this WebView means there's nothing to carry
      // over — a second sign-in on top of it is rejected by Clerk and would
      // wrongly show the failure toast (see native-auth-callback/page.tsx).
      if (isSignedInRef.current) {
        currentRouter.replace("/record");
        return;
      }

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

    // Defers to the isLoaded effect above while Clerk is still loading.
    function handleTicket(ticket: string) {
      if (isSignedInRef.current === undefined) {
        pendingTicketRef.current = ticket;
        return;
      }
      void consumeTicket(ticket);
    }
    consumeRef.current = (ticket) => void consumeTicket(ticket);

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
      if (ticket) handleTicket(ticket);
    });

    let removeListener: (() => void) | undefined;
    App.addListener("appUrlOpen", ({ url }) => {
      const ticket = extractTicket(url);
      if (ticket) handleTicket(ticket);
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
