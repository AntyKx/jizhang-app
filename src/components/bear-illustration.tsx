import Image from "next/image";
import { cn } from "@/lib/utils";

const BEARS = {
  record: "/images/bears/bear-record.webp",
  saving: "/images/bears/bear-saving.webp",
  spending: "/images/bears/bear-spending.webp",
  reports: "/images/bears/bear-reports.webp",
  "goal-achieved": "/images/bears/bear-goal-achieved.webp",
  "over-budget": "/images/bears/bear-over-budget.webp",
  empty: "/images/bears/bear-empty.webp",
  search: "/images/bears/bear-search.webp",
  "ai-analysis": "/images/bears/bear-ai-analysis.webp",
  welcome: "/images/bears/bear-welcome.webp",
  "multi-account": "/images/bears/bear-multi-account.webp",
  "account-management": "/images/bears/bear-account-management.webp",
} as const;

export type BearName = keyof typeof BEARS;

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
    <Image
      src={BEARS[name]}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-2xl", className)}
    />
  );
}
