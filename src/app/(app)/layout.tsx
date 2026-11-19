import { MainNav } from "@/components/main-nav";
import { GlobalQuickAddFab } from "@/components/global-quick-add-fab";
import { ScrollResetOnNavigate } from "@/components/scroll-reset-on-navigate";
import { CoreAccessProvider } from "@/components/core-access-context";
import { requireUserId } from "@/lib/auth";
import { hasCoreAccess } from "@/lib/entitlements";
import { getQuickAddContext } from "@/lib/quick-add-context";
import { getOnboardingState } from "@/lib/onboarding";
import { WelcomeGate } from "@/components/onboarding/welcome-gate";
import { ThemePaletteApplier } from "@/components/theme-palette";
import { ThemesAnnouncement } from "@/components/themes-news";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  const [unlocked, quickAddContext, onboarding] = await Promise.all([
    hasCoreAccess(userId),
    getQuickAddContext(userId),
    getOnboardingState(userId),
  ]);

  return (
    <CoreAccessProvider unlocked={unlocked}>
    {/* body (src/app/layout.tsx) already pads the top by the safe area, so
        a full 100dvh here made every page that much taller than the screen
        — short pages could still be dragged up with nothing below. */}
    <div className="flex min-h-[calc(100dvh-env(safe-area-inset-top))] flex-col">
      <ScrollResetOnNavigate />
      <ThemePaletteApplier />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <GlobalQuickAddFab
        categories={quickAddContext.categories}
        accounts={quickAddContext.accounts}
        transferAccounts={quickAddContext.transferAccounts}
        frequentSplitNames={quickAddContext.frequentSplitNames}
        sharedLocked={!unlocked}
      />
      <MainNav />
      {onboarding.needsWelcome ? <WelcomeGate /> : <ThemesAnnouncement />}
    </div>
    </CoreAccessProvider>
  );
}
