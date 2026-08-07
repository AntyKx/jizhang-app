import { Suspense } from "react";
import { requireUserId } from "@/lib/auth";
import { hasCoreAccess } from "@/lib/entitlements";
import { getQuickAddContext } from "@/lib/quick-add-context";
import { QuickAddSection } from "@/components/record/quick-add-section";
import { HomeSummarySection } from "@/components/record/home-summary-section";
import { DueSubscriptionsSection } from "@/components/record/due-subscriptions-section";
import { TodayTransactionsSection } from "@/components/record/today-transactions-section";
import { Reveal } from "@/components/motion/reveal";
import { Skeleton } from "@/components/ui/skeleton";

// Each section below is its own Suspense island rather than one big
// Promise.all blocking the whole page — see docs/changelog for the
// discussion. QuickAddSection is the one exception: its data
// (categories/accounts/partnerName) is already resolved by
// (app)/layout.tsx before this page starts rendering (getQuickAddContext
// is wrapped in React's cache(), so this call is a free re-read, not a
// second DB round trip), so it renders synchronously instead of behind its
// own boundary — it's the part of the home page a user opens it to
// actually use, and was never the slow part to begin with.
export default async function RecordPage() {
  const userId = await requireUserId();
  const [quickAddContext, unlocked] = await Promise.all([
    getQuickAddContext(userId),
    hasCoreAccess(userId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-3xl" />}>
        <Reveal>
          <HomeSummarySection userId={userId} />
        </Reveal>
      </Suspense>

      {/* No skeleton reserved here — this card is null most of the time
          (no subscriptions due today), so a placeholder that usually just
          collapses to nothing would cause more layout jitter than it
          prevents. */}
      <Suspense fallback={null}>
        <Reveal>
          <DueSubscriptionsSection userId={userId} />
        </Reveal>
      </Suspense>

      <Reveal>
        <QuickAddSection
          categories={quickAddContext.categories}
          accounts={quickAddContext.accounts}
          partnerName={quickAddContext.partnerName}
          sharedLocked={!unlocked}
        />
      </Reveal>

      <Suspense
        fallback={
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-28" />
            <div className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card">
              <Skeleton className="h-16 w-full rounded-none" />
              <Skeleton className="h-16 w-full rounded-none" />
            </div>
          </div>
        }
      >
        <Reveal>
          <TodayTransactionsSection
            userId={userId}
            categories={quickAddContext.categories}
            accounts={quickAddContext.accounts}
            partnerName={quickAddContext.partnerName}
          />
        </Reveal>
      </Suspense>
    </div>
  );
}
