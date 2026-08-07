import { Skeleton } from "@/components/ui/skeleton";

// Generic fallback for every route under (app) that doesn't ship its own
// loading.tsx. Its real job is as much about prefetching as about looks:
// dynamic routes aren't prefetched at all unless a loading boundary exists,
// so this is what makes tab switches feel immediate instead of frozen.
export default function AppLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}
