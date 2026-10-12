"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { track } from "@/lib/analytics/track";

// A gated page rendered with the user's own data, blurred, under an unlock
// card — instead of bouncing them to /upgrade before they've seen what they'd
// get. Only ever wraps that user's own data, so nothing leaks; `inert` keeps
// the blurred charts out of the tab order and the screen reader.
export function LockedPreview({
  unlocked,
  from,
  title,
  points,
  children,
}: {
  unlocked: boolean;
  from: string;
  title: string;
  points: string[];
  children: React.ReactNode;
}) {
  if (unlocked) return children;
  return (
    <div className="relative">
      <div inert aria-hidden className="max-h-[70dvh] overflow-hidden blur-[6px] select-none [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
        {children}
      </div>
      <div className="absolute inset-x-0 top-10 flex justify-center px-2">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border bg-background/95 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-4" />
            </span>
            <span className="font-semibold">{title}</span>
          </div>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                <span className="text-pretty">{p}</span>
              </li>
            ))}
          </ul>
          <Link
            href={`/upgrade?from=${encodeURIComponent(from)}`}
            onClick={() => track("locked_preview_unlock_tap")}
            className="flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground active:bg-primary/80"
          >
            NT$120 一次買斷，永久解鎖
          </Link>
          <span className="text-center text-xs text-muted-foreground">後面模糊的是你自己的資料</span>
        </div>
      </div>
    </div>
  );
}
