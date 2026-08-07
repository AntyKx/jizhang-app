"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StaggerList } from "@/components/motion/stagger-list";
import { CountUpNumber } from "@/components/motion/count-up-number";
import { BearIllustration } from "@/components/bear-illustration";
import { EditBudgetDialog } from "@/components/budgets/edit-budget-dialog";

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
      <StaggerList className="flex flex-col gap-4">
        {budgets.map((b) => {
          const pct = Math.min(100, (b.spent / Number(b.limitAmount)) * 100);
          const overBudget = b.spent >= Number(b.limitAmount);
          return (
            <Card key={b.id} className="cursor-pointer" onClick={() => setSelected(b)}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{b.categoryName ?? "整體預算"}</CardTitle>
                {overBudget && <BearIllustration name="over-budget" size={28} className="rounded-full" />}
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className={pct >= 100 ? "text-destructive" : ""}>
                    <CountUpNumber value={b.spent} />
                  </span>
                  <span className="text-muted-foreground">
                    / <CountUpNumber value={Number(b.limitAmount)} />
                  </span>
                </div>
                <Progress value={pct} />
              </CardContent>
            </Card>
          );
        })}
      </StaggerList>

      <EditBudgetDialog budget={selected} onClose={() => setSelected(null)} />
    </>
  );
}
