"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

// Goes back via browser history instead of a fixed href, for a page reached
// from more than one place (e.g. /upgrade from a dozen different lock
// prompts) — "the page I actually came from" is only known via history,
// not a single hardcoded destination. Same rationale as
// CategoriesDoneButton and TransactionsFilterHeader's back button.
export function BackHistoryLink({ label }: { label: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" strokeWidth={2} />
      {label}
    </button>
  );
}
