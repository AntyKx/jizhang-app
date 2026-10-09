import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { isDevAdmin } from "@/lib/entitlements";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = {
  title: "後台 - 小熊記帳本",
  robots: { index: false, follow: false },
};

// Desktop-first web dashboard, deliberately outside the (app) group so it
// doesn't inherit the phone layout (max-w-md column, bottom nav, FAB).
// Only DEV_ADMIN_USER_ID gets in; everyone else gets a plain 404.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  if (!isDevAdmin(userId)) notFound();

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <AdminNav />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
