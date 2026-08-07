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
        <Input id="from" name="from" type="date" defaultValue={from} className="w-[8.5rem] text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="to" className="text-xs text-muted-foreground">
          結束日期
        </Label>
        <Input id="to" name="to" type="date" defaultValue={to} className="w-[8.5rem] text-sm" />
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
