import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createAiSubscriptionCheckoutSession,
  createBillingPortalSession,
  createCoreCheckoutSession,
} from "./actions";

const featureFromLabel: Record<string, string> = {
  "stats-advanced": "進階統計",
  "stats-budgets-goals": "預算與目標統計",
  "data-export": "資料匯出",
  shared: "分帳本",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; status?: string }>;
}) {
  const userId = await requireUserId();
  const { from, status } = await searchParams;

  const [settings] = await db
    .select({
      hasPurchasedCore: userSettings.hasPurchasedCore,
      aiSubscriptionStatus: userSettings.aiSubscriptionStatus,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const unlocked = settings?.hasPurchasedCore ?? false;
  const isSubscribed = settings?.aiSubscriptionStatus === "active";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">升級</h1>

      {status === "success" && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-700">
          付款成功！若功能還沒立即解鎖，重新整理頁面看看。
        </div>
      )}
      {from && featureFromLabel[from] && (
        <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
          「{featureFromLabel[from]}」是核心解鎖功能，解鎖後即可使用。
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>核心解鎖</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            一次性付費，永久解鎖多帳戶、進階統計、資料匯出、分帳本。
          </p>
          <p className="text-2xl font-semibold tabular-nums">NT$99</p>
          {unlocked ? (
            <div className="rounded-lg bg-muted px-3 py-2 text-center text-sm font-medium text-muted-foreground">
              已解鎖
            </div>
          ) : (
            <form action={createCoreCheckoutSession}>
              <Button type="submit" className="w-full">
                立即解鎖
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 訂閱</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">每月訂閱，解鎖 AI 記帳與收據辨識的高額度使用。</p>
          <p className="text-2xl font-semibold tabular-nums">
            NT$30<span className="text-sm font-normal text-muted-foreground">/月</span>
          </p>
          {isSubscribed ? (
            <form action={createBillingPortalSession}>
              <Button type="submit" variant="outline" className="w-full">
                管理訂閱
              </Button>
            </form>
          ) : (
            <form action={createAiSubscriptionCheckoutSession}>
              <Button type="submit" className="w-full">
                訂閱
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
