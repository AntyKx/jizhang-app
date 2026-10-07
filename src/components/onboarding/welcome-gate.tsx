"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WelcomeSetup } from "@/components/onboarding/welcome-setup";
import { completeOnboarding } from "@/app/(app)/onboarding/actions";

// Full-screen first-login setup, mounted from the (app) layout only for a
// brand-new user. Sits under the bear splash (z-70) so it's revealed as the
// splash fades, and under the amount keypad panel (z-60) so the keypad
// opens on top of it.
export function WelcomeGate() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function finish(setup: Parameters<typeof completeOnboarding>[0]) {
    if (pending) return;
    startTransition(async () => {
      try {
        await completeOnboarding(setup);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("儲存失敗，請稍後再試");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-10">
        <WelcomeSetup onComplete={(input) => finish(input)} onSkip={() => finish(null)} pending={pending} />
      </div>
    </div>
  );
}
