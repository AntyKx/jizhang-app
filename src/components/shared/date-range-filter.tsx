"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { zhTW } from "date-fns/locale";
import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { getTodayInTaipei } from "@/lib/date";
import { cn } from "@/lib/utils";

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

// Booking-site style range picker: 1st tap starts a fresh range, 2nd tap
// closes it (auto-swapping if the 2nd tap lands before the 1st), a 3rd tap
// starts over instead of nudging whichever edge is "closer" — less
// surprising on a small touch target than guessing intent. Replaces the old
// pair of native <input type="date"> + a GET <form> — that form did a real
// browser navigation on submit (full reload flash, scroll reset), which is
// what this component's router.push (client-side, same route) exists to
// avoid.
export function DateRangeFilter({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (from ? parseISO(from) : getTodayInTaipei()));
  const [start, setStart] = useState<Date | undefined>(from ? parseISO(from) : undefined);
  const [end, setEnd] = useState<Date | undefined>(to ? parseISO(to) : undefined);

  function pickDay(day: Date) {
    if (!start || (start && end)) {
      setStart(day);
      setEnd(undefined);
      return;
    }
    if (isBefore(day, start)) {
      setEnd(start);
      setStart(day);
    } else {
      setEnd(day);
    }
  }

  function apply() {
    if (!start) return;
    const params = new URLSearchParams();
    params.set("from", format(start, "yyyy-MM-dd"));
    params.set("to", format(end ?? start, "yyyy-MM-dd"));
    router.push(`/shared?${params}`);
    setOpen(false);
  }

  function clear() {
    setStart(undefined);
    setEnd(undefined);
    router.push("/shared");
    setOpen(false);
  }

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const label = from ? `${from}${to && to !== from ? ` ~ ${to}` : ""}` : "選擇日期區間";

  return (
    <>
      <div className="flex items-center gap-2 rounded-2xl border bg-card p-2.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3 text-sm text-foreground hover:bg-muted"
        >
          <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn(!from && "text-muted-foreground")}>{label}</span>
        </button>
        {(from || to) && (
          <button
            type="button"
            onClick={clear}
            aria-label="清除篩選"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetTitle>選擇日期區間</BottomSheetTitle>

          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold">{format(month, "yyyy年M月", { locale: zhTW })}</span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
            {weekdays.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = day.getMonth() === month.getMonth();
              const isStart = start && isSameDay(day, start);
              const isEnd = end && isSameDay(day, end);
              const hasRange = Boolean(start && end && !isSameDay(start, end));
              const inBetween = hasRange && isAfter(day, start!) && isBefore(day, end!);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => pickDay(day)}
                  className={cn(
                    "relative flex h-10 items-center justify-center text-sm transition-colors",
                    !inMonth && "invisible",
                    inBetween && "bg-primary/10",
                    (isStart || isEnd) && "bg-primary font-medium text-primary-foreground",
                    isStart && hasRange && "rounded-l-full",
                    isEnd && hasRange && "rounded-r-full",
                    (isStart || isEnd) && !hasRange && "rounded-full",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 pb-2">
            <Button type="button" variant="outline" className="flex-1" onClick={clear}>
              清除
            </Button>
            <Button type="button" className="flex-1" onClick={apply} disabled={!start}>
              套用
            </Button>
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
