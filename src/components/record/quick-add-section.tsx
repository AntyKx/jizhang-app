"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LayoutGrid, Mic } from "lucide-react";
import { OneTimeHint } from "@/components/onboarding/gesture-hint";
import { track } from "@/lib/analytics/track";
import { QuickAddCategoryFlow } from "@/components/record/quick-add-category-flow";
import { PersonalAiQuickAddFlow } from "@/components/record/personal-ai-quick-add-flow";
import { VoiceFixedHint } from "@/components/record/voice-fixed-hint";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

// The AI bar + category grid — split out of the old monolithic RecordScreen
// so it can render synchronously on /record instead of waiting behind the
// same Suspense boundary as the summary/subscriptions/today's-list
// sections. Its data (categories/accounts/frequentSplitNames) is already
// resolved by (app)/layout.tsx before this page even starts rendering, so
// there's nothing for it to wait on — this is the part of the home page a
// user opens it to actually use, so it shouldn't be held hostage by a
// slower Clerk API call or DB aggregation elsewhere on the page.
export function QuickAddSection({
  categories,
  accounts,
  frequentSplitNames,
  sharedLocked,
  showAiTip = false,
  showVoiceFixedTip = false,
  previewVoiceFixedTip = false,
}: {
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  frequentSplitNames: string[];
  sharedLocked: boolean;
  // Records by hand but has never used one-line quick-add — point at the
  // bar above the category grid once (see getOnboardingState).
  showAiTip?: boolean;
  // Has never had a recording transcribed — VoiceFixedHint then decides on
  // the device whether this is an Android app that couldn't record before.
  showVoiceFixedTip?: boolean;
  // Admin-only ?previewTip=voice: show it on any device.
  previewVoiceFixedTip?: boolean;
}) {
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-col gap-6">
      <PersonalAiQuickAddFlow
        categories={categories}
        accounts={accounts}
        defaultAccountId={accounts[0]?.id ?? ""}
        frequentSplitNames={frequentSplitNames}
        // Lazy-initialized from the URL so opening via the home screen's
        // long-press app shortcut (manifest.ts `action=quickadd`/`action=scan`)
        // jumps straight into the right sheet — closest a PWA can get to a
        // widget without going native.
        initialShowText={searchParams.get("action") === "quickadd"}
        initialShowScan={searchParams.get("action") === "scan"}
        listenForTry
      />
      {/* At most one tip under the bar: the first-AI-use tip already points
          at the mic, so the voice one waits until that's out of the way. */}
      {previewVoiceFixedTip ? (
        <VoiceFixedHint preview />
      ) : (
        !showAiTip && showVoiceFixedTip && <VoiceFixedHint />
      )}
      {showAiTip && !previewVoiceFixedTip && (
        <OneTimeHint
          id="quickadd-discover"
          icon={<Mic className="size-4" />}
          className="-mt-4"
          onDismiss={() => track("quickadd_tip_dismissed")}
        >
          不用點分類，直接打「午餐 120」或按麥克風用說的，就記好了
        </OneTimeHint>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[15px] font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/12 text-primary">
              <LayoutGrid className="size-3.5" strokeWidth={2} />
            </span>
            選擇分類
          </span>
          <Link
            href="/categories"
            className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            管理分類
            <ChevronRight className="size-3.5" strokeWidth={2} />
          </Link>
        </div>

        {/* 分帳記帳 used to be a separate pill button + dialog here; it's now
            just a third tab next to 支出/收入 inside the flow below (see
            QuickAddCategoryFlow's enableSharedTab), reusing the same
            category-grid → amount-sheet flow instead of a second form. */}
        <QuickAddCategoryFlow
          categories={categories}
          accounts={accounts}
          frequentSplitNames={frequentSplitNames}
          enableSharedTab
          sharedLocked={sharedLocked}
        />
      </div>
    </div>
  );
}
