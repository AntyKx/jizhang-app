import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      {/* month grid inside its card */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
