"use client";

import { useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { CalendarClock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StaggerList } from "@/components/motion/stagger-list";
import { CountUpNumber } from "@/components/motion/count-up-number";
import { BearIllustration } from "@/components/bear-illustration";
import { ContributeForm } from "@/components/goals/contribute-form";
import { EditGoalDialog } from "@/components/goals/edit-goal-dialog";
import { getTodayInTaipei } from "@/lib/date";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  name: string;
  currentAmount: string;
  targetAmount: string;
  targetDate: string | null;
  isCompleted: boolean;
};

export function GoalsList({ goals }: { goals: Goal[] }) {
  const [selected, setSelected] = useState<Goal | null>(null);

  return (
    <>
      <StaggerList className="flex flex-col divide-y">
        {goals.map((g) => {
          const pct = Math.min(100, (Number(g.currentAmount) / Number(g.targetAmount)) * 100);
          return (
            <div key={g.id} className="flex flex-col gap-3 px-1 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="flex-1 cursor-pointer text-sm font-medium"
                  onClick={() => setSelected(g)}
                >
                  {g.name}
                </span>
                {g.isCompleted && (
                  <div className="flex items-center gap-1.5">
                    <BearIllustration name="goal-achieved" size={24} className="rounded-full" />
                    <Badge>已達成</Badge>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <CountUpNumber value={Number(g.currentAmount)} />
                <span className="text-muted-foreground">
                  / <CountUpNumber value={Number(g.targetAmount)} />
                </span>
              </div>
              <Progress value={pct} />
              {!g.isCompleted && g.targetDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CalendarClock className="size-3.5" strokeWidth={1.75} />
                    {g.targetDate}
                  </span>
                  {(() => {
                    const daysLeft = differenceInCalendarDays(
                      parseISO(g.targetDate),
                      getTodayInTaipei(),
                    );
                    // Compare progress-through-time against progress-through-
                    // money so the label says whether saving is actually on
                    // pace, not just how much time is left.
                    const remaining = Number(g.targetAmount) - Number(g.currentAmount);
                    if (daysLeft < 0) {
                      return <span className="font-medium text-destructive">已過期</span>;
                    }
                    const perDay = daysLeft > 0 ? remaining / daysLeft : remaining;
                    return (
                      <span
                        className={cn(
                          "font-medium",
                          daysLeft <= 7 ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        剩 {daysLeft} 天・每天約 {Math.max(0, Math.ceil(perDay)).toLocaleString("zh-TW")}
                      </span>
                    );
                  })()}
                </div>
              )}
              {!g.isCompleted && <ContributeForm goalId={g.id} />}
            </div>
          );
        })}
      </StaggerList>

      <EditGoalDialog goal={selected} onClose={() => setSelected(null)} />
    </>
  );
}
