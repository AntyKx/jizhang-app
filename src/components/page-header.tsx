"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared sticky title bar for every non-home page in (app). Full-bleed like
// HomeSummary's banner: -mx-4 cancels <main>'s px-4, and the marginTop
// cancels both <main>'s py-6 and body's pt-[env(safe-area-inset-top)], so
// the bar's own top edge is the screen's real top edge and the one
// env(safe-area-inset-top) inside it is the only place the safe area is
// paid. That also means it reads the same at rest and once it's stuck —
// no jump when sticky kicks in.
//
// `back`: an href for a fixed parent page, or "history" for pages reached
// from several places (see BackHistoryLink for the rationale).
export function PageHeader({
  title,
  back,
  subtitle,
  leading,
  titleAddon,
  actions,
  className,
}: {
  title: React.ReactNode;
  back?: string | "history";
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  titleAddon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const backClass =
    "-ml-1.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-backdrop-filter:bg-background/70",
        className,
      )}
      style={{ marginTop: "calc(-1.5rem - env(safe-area-inset-top))" }}
    >
      <div className="flex min-h-14 items-center gap-2 px-4 py-2">
        {back === "history" ? (
          <button type="button" onClick={() => router.back()} aria-label="返回" className={backClass}>
            <ChevronLeft className="size-5" strokeWidth={2} />
          </button>
        ) : back ? (
          <Link href={back} aria-label="返回" className={backClass}>
            <ChevronLeft className="size-5" strokeWidth={2} />
          </Link>
        ) : null}
        {leading}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="truncate text-lg leading-tight font-bold">{title}</h1>
            {titleAddon}
          </div>
          {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

// The one section-heading style used across (app) pages.
export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-sm font-semibold text-muted-foreground", className)}>{children}</h2>;
}

// Same footprint as PageHeader, for loading.tsx — so the bar doesn't jump
// when the real page swaps in.
export function PageHeaderSkeleton() {
  return (
    <div
      className="-mx-4 border-b border-border/70 pt-[env(safe-area-inset-top)]"
      style={{ marginTop: "calc(-1.5rem - env(safe-area-inset-top))" }}
    >
      <div className="flex min-h-14 items-center px-4 py-2">
        <div className="h-5 w-28 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
