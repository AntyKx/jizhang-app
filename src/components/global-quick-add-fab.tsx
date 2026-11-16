"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { QuickAddCategoryFlow } from "@/components/record/quick-add-category-flow";
import { PersonalAiQuickAddFlow } from "@/components/record/personal-ai-quick-add-flow";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

// Renders on every page except the home page (mounted alongside MainNav in
// the (app) layout) so a transaction can be logged from anywhere without
// navigating to the home page first. Hidden on /record specifically
// because that page already shows the category grid and the AI text/voice
// bar inline — showing "+" there just pops up the exact same flow again
// on top of itself, which read as a duplicate rather than a shortcut.
//
// Tapping "+" opens one sheet holding the same two things the home page
// shows — the 一句話記帳 bar on top, the category grid under it — and
// closing it returns you right where you were. It used to open a chooser
// first ("一般記帳 / 一句話記帳"), which was an extra tap and an extra
// decision before every entry made away from the home page.
export function GlobalQuickAddFab({
  categories,
  accounts,
  transferAccounts,
  frequentSplitNames,
  sharedLocked,
}: {
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  transferAccounts: QuickAddAccount[];
  frequentSplitNames: string[];
  sharedLocked: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Context defaults derived straight from the URL, not lifted state — the
  // FAB is mounted once in (app)/layout.tsx, a sibling of every page rather
  // than a descendant of any single one, so the URL is the only thing both
  // sides already agree on without wiring up a new shared context.
  const defaultDate = useMemo(() => {
    if (pathname !== "/calendar") return undefined;
    return searchParams.get("day") ?? undefined;
  }, [pathname, searchParams]);

  const contextAccountId = useMemo(() => {
    const match = /^\/accounts\/([^/]+)$/.exec(pathname);
    if (!match) return undefined;
    const id = match[1];
    // Only trust it if it's actually one of the accounts quick-add already
    // knows about — an archived or "exclude from net worth" account has its
    // own /accounts/[id] page but is deliberately left out of this list (see
    // getQuickAddContext), so falling through to the normal default (first
    // account) is correct rather than forcing an invalid selection.
    return accounts.some((a) => a.id === id) ? id : undefined;
  }, [pathname, accounts]);

  if (pathname.startsWith("/record")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="快速記帳"
        className="fixed right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="size-5" strokeWidth={2.5} />
      </button>

      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetTitle className="sr-only">快速記帳</BottomSheetTitle>
          <PersonalAiQuickAddFlow
            categories={categories}
            accounts={accounts}
            defaultAccountId={contextAccountId ?? accounts[0]?.id ?? ""}
            defaultDate={defaultDate}
            frequentSplitNames={frequentSplitNames}
            onDone={() => setOpen(false)}
          />
          <QuickAddCategoryFlow
            categories={categories}
            accounts={accounts}
            frequentSplitNames={frequentSplitNames}
            defaultAccountId={contextAccountId}
            defaultDate={defaultDate}
            onDone={() => setOpen(false)}
            enableSharedTab
            sharedLocked={sharedLocked}
            transferAccounts={transferAccounts}
          />
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
