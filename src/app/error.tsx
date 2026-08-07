"use client";

import { useEffect } from "react";
import { BearIllustration } from "@/components/bear-illustration";

// Catches errors thrown anywhere below the root layout that a more specific
// error.tsx (e.g. (app)/error.tsx) doesn't already catch first — must be a
// Client Component (Next.js requirement for error.tsx). Without this, an
// uncaught error during a cold start would leave the screen stuck wherever
// it broke instead of showing something a user can act on.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <BearIllustration name="empty" size={96} />
      <span className="font-heading text-lg font-medium text-foreground">小熊記帳本</span>
      <p className="text-sm text-muted-foreground">發生了一點問題，請再試一次。</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        重新嘗試
      </button>
    </div>
  );
}
