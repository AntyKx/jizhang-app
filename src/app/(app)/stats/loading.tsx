import { Skeleton } from "@/components/ui/skeleton";

// Covers /stats and its sub-tabs (daily, advanced, budgets-goals) — they all
// share the tab-nav + range-switcher + stacked-cards shape.
export default function StatsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64 rounded-lg" />
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}
