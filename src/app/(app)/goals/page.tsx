import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";
import { GoalsList } from "@/components/goals/goals-list";
import { BearIllustration } from "@/components/bear-illustration";
import { PageHeader } from "@/components/page-header";

export default async function GoalsPage() {
  const userId = await requireUserId();
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, userId));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="儲蓄目標" back="/more" actions={<CreateGoalDialog />} />

      {goals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <BearIllustration name="saving" size={96} />
          <p className="text-muted-foreground text-sm">還沒有設定儲蓄目標。</p>
        </div>
      ) : (
        <GoalsList goals={goals} />
      )}
    </div>
  );
}
