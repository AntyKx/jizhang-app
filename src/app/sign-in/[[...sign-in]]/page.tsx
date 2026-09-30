"use client";

import { SignIn } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { BearIllustration } from "@/components/bear-illustration";

export default function SignInPage() {
  // Inside the Android app, every successful sign-in (OAuth or plain
  // email/password) needs to hand its session back through
  // /native-auth-callback — see src/components/native-auth-listener.tsx for
  // why, even for strategies that never left the WebView.
  const forceRedirectUrl = Capacitor.isNativePlatform() ? "/native-auth-callback" : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <BearIllustration name="welcome" size={140} alt="歡迎回來" className="rounded-3xl" />
      <SignIn forceRedirectUrl={forceRedirectUrl} />
    </div>
  );
}
