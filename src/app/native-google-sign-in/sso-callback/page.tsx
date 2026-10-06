"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

// Where Clerk lands after Google when the OAuth flow still needs completing
// client-side (e.g. a first-time Google user being transferred to sign-up).
// Either way the result goes to /api/native-auth-handoff, which hands the
// new session back to the app.
export default function NativeGoogleSsoCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">登入中…</p>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/api/native-auth-handoff"
        signUpForceRedirectUrl="/api/native-auth-handoff"
      />
    </div>
  );
}
