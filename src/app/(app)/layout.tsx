import { MainNav } from "@/components/main-nav";
import { GlobalQuickAddFab } from "@/components/global-quick-add-fab";
import { ScrollResetOnNavigate } from "@/components/scroll-reset-on-navigate";
import { requireUserId } from "@/lib/auth";
import { hasCoreAccess } from "@/lib/entitlements";
import { getQuickAddContext } from "@/lib/quick-add-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  const [unlocked, quickAddContext] = await Promise.all([
    hasCoreAccess(userId),
    getQuickAddContext(userId),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollResetOnNavigate />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <GlobalQuickAddFab
        categories={quickAddContext.categories}
        accounts={quickAddContext.accounts}
        partnerName={quickAddContext.partnerName}
        sharedLocked={!unlocked}
      />
      <MainNav />
    </div>
  );
}
