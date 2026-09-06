"use client";

import { useSearchParams } from "next/navigation";
import { QuickAddCategoryFlow } from "@/components/record/quick-add-category-flow";
import { PersonalAiQuickAddFlow } from "@/components/record/personal-ai-quick-add-flow";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

// The AI bar + category grid — split out of the old monolithic RecordScreen
// so it can render synchronously on /record instead of waiting behind the
// same Suspense boundary as the summary/subscriptions/today's-list
// sections. Its data (categories/accounts/partnerName) is already resolved
// by (app)/layout.tsx before this page even starts rendering, so there's
// nothing for it to wait on — this is the part of the home page a user
// opens it to actually use, so it shouldn't be held hostage by a slower
// Clerk API call or DB aggregation elsewhere on the page.
export function QuickAddSection({
  categories,
  accounts,
  partnerName,
  sharedLocked,
}: {
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  partnerName: string;
  sharedLocked: boolean;
}) {
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-col gap-6">
      <PersonalAiQuickAddFlow
        categories={categories}
        accounts={accounts}
        defaultAccountId={accounts[0]?.id ?? ""}
        partnerName={partnerName}
        // Lazy-initialized from the URL so opening via the home screen's
        // long-press app shortcut (manifest.ts `action=quickadd`/`action=scan`)
        // jumps straight into the right sheet — closest a PWA can get to a
        // widget without going native.
        initialShowText={searchParams.get("action") === "quickadd"}
        initialShowScan={searchParams.get("action") === "scan"}
      />

      <span className="text-sm font-semibold text-muted-foreground">選擇分類</span>

      {/* 分帳記帳 used to be a separate pill button + dialog here; it's now
          just a third tab next to 支出/收入 inside the flow below (see
          QuickAddCategoryFlow's enableSharedTab), reusing the same
          category-grid → amount-sheet flow instead of a second form. */}
      <QuickAddCategoryFlow
        categories={categories}
        accounts={accounts}
        partnerName={partnerName}
        enableSharedTab
        sharedLocked={sharedLocked}
      />
    </div>
  );
}
