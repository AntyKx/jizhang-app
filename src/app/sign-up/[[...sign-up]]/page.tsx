"use client";

import { SignUp } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { BearIllustration } from "@/components/bear-illustration";

export default function SignUpPage() {
  // See src/app/sign-in/[[...sign-in]]/page.tsx for why native needs this.
  const forceRedirectUrl = Capacitor.isNativePlatform() ? "/native-auth-callback" : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <BearIllustration name="welcome" size={140} alt="歡迎加入" className="rounded-3xl" />
      <SignUp forceRedirectUrl={forceRedirectUrl} />
    </div>
  );
}
