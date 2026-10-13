import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { isDevAdmin } from "@/lib/entitlements";

export const metadata = { robots: { index: false, follow: false } };

// TEMPORARY design previews (admin only). Outside the (app) group so the
// phone-sized iframes inside don't inherit the bottom nav / FAB.
export default async function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  if (!isDevAdmin(userId)) notFound();
  return children;
}
