import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangeFilter({ from, to }: { from?: string; to?: string }) {
  return (
    <form action="/shared" method="GET" className="flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-2.5">
      <div className="flex flex-col gap-1">
        <Label htmlFor="from" className="text-xs text-muted-foreground">
          起始日期
        </Label>
        {/* No text-sm override here — a sub-16px font on a real <input>
            makes iOS Safari auto-zoom the whole page in on focus and never
            zoom back out on its own, which is exactly the "webpage, not an
            app" feel this project has been removing elsewhere. Widened to
            fit the base component's larger text instead of shrinking it. */}
        <Input id="from" name="from" type="date" defaultValue={from} className="w-[9.5rem]" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="to" className="text-xs text-muted-foreground">
          結束日期
        </Label>
        <Input id="to" name="to" type="date" defaultValue={to} className="w-[9.5rem]" />
      </div>
      <Button type="submit" size="sm">
        套用
      </Button>
      {(from || to) && (
        <Link
          href="/shared"
          className="flex h-8 items-center rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted"
        >
          清除篩選
        </Link>
      )}
    </form>
  );
}
