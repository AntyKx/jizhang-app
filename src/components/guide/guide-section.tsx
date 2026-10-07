"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { BearIllustration, hasBearArt, type BearName } from "@/components/bear-illustration";
import { cn } from "@/lib/utils";

// One collapsible block per feature area on the /guide page — each manages
// its own open state (rather than an uncontrolled Collapsible) so the
// chevron can rotate the same way SplitEventCard/SettlementGroupRow already
// do elsewhere, instead of guessing at base-ui's open-state data attribute.
//
// `icon` takes an already-rendered element (<BookOpen .../>), not the icon
// component itself — the page that renders this stays a server component,
// and a bare component reference (a function) can't cross the server/client
// boundary as a prop, only an already-instantiated element can.
//
// `id` doubles as a deep-link anchor: other pages' "?" buttons link to
// /guide#<id>, and the matching section opens itself and scrolls into view.
export function GuideSection({
  id,
  icon,
  title,
  summary,
  bear,
  href,
  hrefLabel,
  defaultOpen = false,
  children,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  bear?: BearName;
  href?: string;
  hrefLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    function openIfTargeted() {
      if (window.location.hash !== `#${id}`) return;
      setOpen(true);
      requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "start" }));
    }
    // Deferred a frame rather than run in the effect body — the hash is
    // only readable client-side, so it can't seed useState without a
    // hydration mismatch.
    const frame = requestAnimationFrame(openIfTargeted);
    window.addEventListener("hashchange", openIfTargeted);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openIfTargeted);
    };
  }, [id]);

  return (
    <Collapsible
      ref={ref}
      id={id}
      open={open}
      onOpenChange={setOpen}
      className="flex scroll-mt-4 flex-col rounded-2xl border bg-card"
    >
      <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-left hover:text-foreground">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col gap-2 px-4 pb-4 text-sm leading-relaxed text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5 [&_strong]:font-medium [&_strong]:text-foreground">
          {bear && hasBearArt(bear) && <BearIllustration name={bear} size={96} className="mx-auto" />}
          {children}
          {href && (
            <Link
              href={href}
              className="mt-1 flex items-center justify-center gap-1 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-primary active:bg-primary/20"
            >
              {hrefLabel ?? `前往${title}`}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
