import { UserButton } from "@clerk/nextjs";
import { MainNav } from "@/components/main-nav";
import { requireUserId } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUserId();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold">記帳本 🐣</span>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 pb-24">{children}</main>
      <MainNav />
    </div>
  );
}
