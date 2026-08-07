import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";
import { GoalsList } from "@/components/goals/goals-list";
import { BearIllustration } from "@/components/bear-illustration";

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
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center shadow-md shadow-foreground/10">
          <BearIllustration name="saving" size={96} />
          <p className="text-muted-foreground text-sm">還沒有設定儲蓄目標。</p>
        </div>
      ) : (
        <GoalsList goals={goals} />
      )}
    </div>
  );
}
