"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, DatabaseBackup, LayoutDashboard, Sparkles, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "總覽", Icon: LayoutDashboard },
  { href: "/admin/users", label: "使用者", Icon: Users },
  { href: "/admin/payments", label: "付費", Icon: Wallet },
  { href: "/admin/backups", label: "備份", Icon: DatabaseBackup },
  { href: "/admin/ai", label: "AI 使用", Icon: Sparkles },
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <nav className="sticky top-0 z-10 flex shrink-0 flex-col gap-1 border-b bg-card/95 px-3 py-3 backdrop-blur md:h-[100dvh] md:w-56 md:border-r md:border-b-0 md:px-4 md:py-6">
      <div className="hidden px-2 pb-4 md:block">
        <p className="text-base font-semibold">小熊記帳本</p>
        <p className="text-xs text-muted-foreground">後台</p>
      </div>
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] md:flex-col">
        {links.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
              isActive(href) ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </div>
      <Link
        href="/record"
        className="mt-auto hidden items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground md:flex"
      >
        <ArrowLeft className="size-3.5" />
        回到 App
      </Link>
    </nav>
  );
}
