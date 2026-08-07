"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LineChart, MoreHorizontal, SquarePen, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";

const links = [
  { href: "/record", label: "首頁", Icon: SquarePen },
  { href: "/calendar", label: "行事曆", Icon: Calendar },
  { href: "/accounts", label: "帳戶", Icon: Wallet },
  { href: "/stats", label: "統計", Icon: LineChart },
  { href: "/more", label: "更多", Icon: MoreHorizontal },
];

export function MainNav() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const active = links.find((link) => pathname.startsWith(link.href))?.href ?? links[0].href;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-card/80">
      <div ref={containerRef} className="relative isolate mx-auto flex max-w-md items-center justify-around px-2 py-2">
        <SlidingIndicator
          activeKey={active}
          containerRef={containerRef}
          className="-z-10 rounded-xl bg-primary/10"
        />
        {links.map(({ href, label, Icon }) => {
          const isActive = href === active;
          return (
            <Link
              key={href}
              href={href}
              data-key={href}
              // These five are dynamic routes, where the default prefetch
              // only fetches down to the loading.tsx boundary — i.e. the
              // skeleton, with no data, so the first switch to a tab still
              // paid a full round trip. `prefetch` fetches the complete
              // route including its data, so the first switch is warm too.
              // It also promotes these to the `static` client-cache TTL.
              prefetch
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
