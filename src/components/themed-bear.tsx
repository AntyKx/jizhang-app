"use client";

import { useSyncExternalStore } from "react";
import { readPalette, subscribePalette } from "@/components/theme-palette";
import { themedBearSvg, type BearVariant } from "@/lib/themed-bear";
import { cn } from "@/lib/utils";

// The home banner's bear. Default theme: the original bear-mark PNG, so
// nothing changes for anyone not trying a theme; with a theme on, that
// theme's dressed-up bear (static SVG from src/lib/themed-bear.ts).
export function ThemedBear({ variant, className }: { variant?: BearVariant; className?: string }) {
  const palette = useSyncExternalStore(subscribePalette, readPalette, () => "default" as const);
  const v = variant ?? palette;
  if (v === "default") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/icons/bear-mark-v2.png" alt="" className={cn("object-contain", className)} />;
  }
  return <span aria-hidden className={cn("block", className)} dangerouslySetInnerHTML={{ __html: themedBearSvg(v) }} />;
}
