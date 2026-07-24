import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";
import { ContributeForm } from "@/components/goals/contribute-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default async function GoalsPage() {
  const userId = await requireUserId();
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, userId));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">儲蓄目標</h1>
        <CreateGoalDialog />
      </div>

      {goals.length === 0 ? (
        <p className="text-muted-foreground text-sm">還沒有設定儲蓄目標。</p>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.map((g) => {
            const pct = Math.min(
              100,
              (Number(g.currentAmount) / Number(g.targetAmount)) * 100,
            );
            return (
              <Card key={g.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  {g.isCompleted && <Badge>已達成</Badge>}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm">
                    <span>{Number(g.currentAmount).toLocaleString("zh-TW")}</span>
                    <span className="text-muted-foreground">
                      / {Number(g.targetAmount).toLocaleString("zh-TW")}
                    </span>
                  </div>
                  <Progress value={pct} />
                  {!g.isCompleted && <ContributeForm goalId={g.id} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
