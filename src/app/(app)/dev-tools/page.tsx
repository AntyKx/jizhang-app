import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings, aiSubscriptionStatusEnum } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isDevAdmin } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setOwnAiSubscriptionStatus, setOwnCoreUnlock } from "./actions";

const statusLabel: Record<(typeof aiSubscriptionStatusEnum.enumValues)[number], string> = {
  none: "無訂閱",
  active: "訂閱中",
  past_due: "逾期未繳",
  canceled: "已取消",
};

export default async function DevToolsPage() {
  const userId = await requireUserId();
  if (!isDevAdmin(userId)) notFound();

  const [settings] = await db
    .select({
      hasPurchasedCore: userSettings.hasPurchasedCore,
      aiSubscriptionStatus: userSettings.aiSubscriptionStatus,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const unlocked = settings?.hasPurchasedCore ?? false;
  const currentStatus = settings?.aiSubscriptionStatus ?? "none";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">開發者工具</h1>
        <p className="text-sm text-muted-foreground">
          只有你的帳號看得到這頁——用來測試解鎖／訂閱狀態下的畫面差異，不會影響任何其他使用者。
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">核心解鎖</h2>
        <p className="text-sm text-muted-foreground">目前狀態：{unlocked ? "已解鎖" : "未解鎖"}</p>
        <form action={setOwnCoreUnlock.bind(null, !unlocked)}>
          <Button type="submit" variant={unlocked ? "outline" : "default"} className="w-full">
            {unlocked ? "設為未解鎖" : "設為已解鎖"}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">AI 訂閱狀態</h2>
        <p className="text-sm text-muted-foreground">目前狀態：{statusLabel[currentStatus]}</p>
        <div className="grid grid-cols-2 gap-2">
          {aiSubscriptionStatusEnum.enumValues.map((status) => (
            <form key={status} action={setOwnAiSubscriptionStatus.bind(null, status)}>
              <Button
                type="submit"
                variant="outline"
                className={cn("w-full", status === currentStatus && "border-primary text-primary")}
              >
                {statusLabel[status]}
              </Button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
