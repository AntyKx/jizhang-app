"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

export type PickerCategory = { id: string; name: string; icon?: string | null };

// Drop-in replacement for the shadcn `<Select>` category dropdown — that
// dropdown renders every category as a single-column list, which gets very
// tall and covers the rest of the form once a user has 10+ categories (real
// user feedback, screenshot showed the list swallowing the whole edit
// dialog). This opens the same bear-icon grid the record screen already
// uses instead, in a bottom sheet — many columns, no endless scrolling, and
// visually consistent with the rest of the app's category pickers.
export function CategoryPickerSheet({
  categories,
  value,
  onChange,
  placeholder = "選擇分類",
  className,
}: {
  categories: PickerCategory[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === value);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm transition-colors outline-none",
          className,
        )}
      >
        <span className={cn("flex flex-1 items-center gap-1.5 truncate text-left", !selected && "text-muted-foreground")}>
          {selected ? (
            <>
              <CategoryIcon icon={selected.icon ?? null} className="h-4 w-4 shrink-0" />
              {selected.name}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetTitle>選擇分類</BottomSheetTitle>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            <button
              type="button"
              onClick={() => pick("")}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-2xl border bg-card p-2 shadow-sm transition-shadow hover:shadow-md",
                !value && "border-primary bg-primary/10",
              )}
            >
              <span className="flex h-16 w-16 items-center justify-center text-2xl text-muted-foreground">—</span>
              <span className="text-xs text-muted-foreground">不指定</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl border bg-card p-2 shadow-sm transition-shadow hover:shadow-md",
                  value === c.id && "border-primary bg-primary/10",
                )}
              >
                <CategoryIcon icon={c.icon ?? null} className="h-16 w-16 text-3xl" />
                <span className="text-xs text-muted-foreground">{c.name}</span>
              </button>
            ))}
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
