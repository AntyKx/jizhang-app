"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { CategoryIconBadge } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";

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
  return (
    <PageHeader
      title={name}
      subtitle={label}
      back="history"
      leading={<CategoryIconBadge icon={icon} color={color} className="h-9 w-9" iconClassName="h-4 w-4" />}
      actions={
        <Link
          href="/transactions"
          className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-3.5" strokeWidth={1.75} />
          清除篩選
        </Link>
      }
    />
  );
}
