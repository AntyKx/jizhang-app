"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryIconBadge } from "@/components/category-icon";
import { categoryDisplayName } from "@/lib/category-display-name";
import { updateTransactionCategory } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";

type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };

export function QuickCategoryDialog({
  transaction,
  categories,
  open,
  onOpenChange,
  onSaved,
}: {
  transaction: { id: string; type: "income" | "expense" } | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const relevantCategories = categories.filter((c) => c.type === transaction?.type);

  function pick(categoryId: string) {
    if (!transaction || pending) return;
    startTransition(async () => {
      const result = await updateTransactionCategory(transaction.id, categoryId);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已更改分類");
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>快速改分類</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-x-1 gap-y-4 sm:grid-cols-5">
          {relevantCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={pending}
              onClick={() => pick(c.id)}
              className="flex flex-col items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              <CategoryIconBadge
                icon={c.icon}
                color={c.color}
                className="h-[54px] w-[54px]"
                iconClassName="h-[22px] w-[22px]"
              />
              <span className="line-clamp-2 text-center text-[11.5px] font-medium leading-tight text-muted-foreground">
                {categoryDisplayName(c.name)}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
