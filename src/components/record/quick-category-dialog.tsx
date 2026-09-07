"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/category-icon";
import { updateTransactionCategory } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";

type Category = { id: string; name: string; icon: string | null; type: "income" | "expense" };

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
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {relevantCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={pending}
              onClick={() => pick(c.id)}
              className="flex flex-col items-center gap-0.5 rounded-2xl border bg-card p-2 shadow-md shadow-foreground/10 transition-shadow hover:shadow-md disabled:opacity-50"
            >
              <CategoryIcon icon={c.icon} className="h-14 w-14 text-2xl" />
              <span className="text-xs text-muted-foreground">{c.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
