import { Skeleton } from "@/components/ui/skeleton";

export default function RecordLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      {/* greeting/summary card */}
      <Skeleton className="h-40 w-full rounded-3xl" />
      {/* quick-add bar */}
      <Skeleton className="h-24 w-full rounded-2xl" />
      {/* expense/income toggle */}
      <Skeleton className="h-10 w-full rounded-full" />
      {/* category grid */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
