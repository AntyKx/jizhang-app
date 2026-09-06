"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import { CategoryIconBadge } from "@/components/category-icon";

// Shown instead of the plain "所有交易" title when /transactions was reached
// filtered from a category on /stats. `router.back()` (not a Link to
// /stats) so it returns to whatever range/scroll state the user actually
// came from — reconstructing that from the filter's own query params would
// only ever approximate it.
export function TransactionsFilterHeader({
  icon,
  color,
  name,
  label,
}: {
  icon: string | null;
  color: string | null | undefined;
  name: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="返回"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
        </button>
        <CategoryIconBadge icon={icon} color={color} className="h-9 w-9" iconClassName="h-4 w-4" />
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold leading-tight">{name}</h1>
          {label && <span className="text-muted-foreground text-xs">{label}</span>}
        </div>
      </div>
      <Link
        href="/transactions"
        className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        <X className="size-3.5" strokeWidth={1.75} />
        清除篩選
      </Link>
    </div>
  );
}
