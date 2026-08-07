"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Handshake } from "lucide-react";
import { QuickAddCategoryFlow } from "@/components/record/quick-add-category-flow";
import { PersonalAiQuickAddFlow } from "@/components/record/personal-ai-quick-add-flow";
import { AddSharedExpenseDialog } from "@/components/shared/add-expense-dialog";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showShared, setShowShared] = useState(false);

  function openShared() {
    if (sharedLocked) {
      router.push("/upgrade?from=shared");
      return;
    }
    setShowShared(true);
  }

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

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">選擇分類</span>
        <button
          type="button"
          onClick={openShared}
          className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <Handshake className="size-3.5" strokeWidth={1.75} />
          分帳記帳
        </button>
      </div>

      <QuickAddCategoryFlow categories={categories} accounts={accounts} partnerName={partnerName} />

      <AddSharedExpenseDialog
        categories={categories.filter((c) => c.type === "expense")}
        partnerName={partnerName}
        open={showShared}
        onOpenChange={setShowShared}
      />
    </div>
  );
}
