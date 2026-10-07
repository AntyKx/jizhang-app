import { cn } from "@/lib/utils";

export type BearName =
  | "record"
  | "saving"
  | "spending"
  | "reports"
  | "goal-achieved"
  | "over-budget"
  | "empty"
  | "search"
  | "ai-analysis"
  | "welcome"
  | "multi-account"
  | "account-management"
  | "categorize"
  | "split"
  | "budget-planning"
  | "subscription"
  | "calendar"
  | "cloud-backup"
  | "secure-login";

// Every scene-specific photographic bear (see git history) has been
// replaced by flat round bear-mark icons — most names still share one
// generic mark since only a few scenes have their own art so far; add an
// entry here as more come in.
const BEARS: Partial<Record<BearName, string>> = {
  record: "/icons/bear-record.png",
  empty: "/icons/bear-empty.png",
  "ai-analysis": "/icons/bear-ai-analysis.png",
};
const DEFAULT_BEAR = "/icons/bear-mark-v2.png";

// For places that should show a scene only once it has its own art, rather
// than repeat the generic mark (e.g. one per /guide section) — adding the
// file to BEARS above makes it appear there automatically.
export function hasBearArt(name: BearName) {
  return name in BEARS;
}

export function BearIllustration({
  name,
  size = 96,
  alt = "",
  className,
}: {
  name: BearName;
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BEARS[name] ?? DEFAULT_BEAR}
      alt={alt}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
