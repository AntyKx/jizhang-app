"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { StaggerList } from "@/components/motion/stagger-list";
import { CountUpNumber } from "@/components/motion/count-up-number";
import { BearIllustration } from "@/components/bear-illustration";
import { EditBudgetDialog } from "@/components/budgets/edit-budget-dialog";
import { cn } from "@/lib/utils";

type Budget = {
  id: string;
  categoryName: string | null;
  limitAmount: string;
  spent: number;
};

export function BudgetsList({ budgets }: { budgets: Budget[] }) {
  const [selected, setSelected] = useState<Budget | null>(null);

  return (
    <>
      <StaggerList className="flex flex-col divide-y">
        {budgets.map((b) => {
          const pct = Math.min(100, (b.spent / Number(b.limitAmount)) * 100);
          const overBudget = b.spent >= Number(b.limitAmount);
          return (
            <div
              key={b.id}
              className="flex cursor-pointer items-center gap-3 px-1 py-3.5"
              onClick={() => setSelected(b)}
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{b.categoryName ?? "整體預算"}</span>
                  <span className={cn("tabular-nums", pct >= 100 ? "text-destructive" : "")}>
                    <CountUpNumber value={b.spent} />
                    <span className="text-muted-foreground">
                      {" "}
                      / <CountUpNumber value={Number(b.limitAmount)} />
                    </span>
                  </span>
                </div>
                <Progress value={pct} />
              </div>
              {overBudget && (
                <BearIllustration name="over-budget" size={28} className="shrink-0 rounded-full" />
              )}
            </div>
          );
        })}
      </StaggerList>

      <EditBudgetDialog budget={selected} onClose={() => setSelected(null)} />
    </>
  );
}
