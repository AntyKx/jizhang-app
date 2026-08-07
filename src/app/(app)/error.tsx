"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BearIllustration } from "@/components/bear-illustration";

// Catches errors thrown while rendering a specific page inside (app) — the
// nav/FAB shell around it comes from (app)/layout.tsx, which already
// succeeded by the time a page-level error can happen, so this only needs
// to replace the page content, not rebuild the whole shell.
export default function AppError({
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
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-12 text-center">
      <BearIllustration name="empty" size={96} />
      <p className="text-sm text-muted-foreground">這個畫面出了一點問題，請再試一次。</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          重新嘗試
        </button>
        <Link
          href="/record"
          className="rounded-full border px-5 py-2 text-sm font-medium text-foreground"
        >
          回首頁
        </Link>
      </div>
    </div>
  );
}
