import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isTrialActive, trialDaysRemaining } from "@/lib/entitlements";
import { Button, buttonVariants } from "@/components/ui/button";
import { BackHistoryLink } from "@/components/back-history-link";
import { CoreUnlockCta } from "@/components/upgrade/core-unlock-cta";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";
import { createAllInOneCheckoutSession, createBillingPortalSession } from "./actions";

const featureFromLabel: Record<string, string> = {
  "stats-advanced": "進階統計",
  "stats-budgets-goals": "預算與目標統計",
  "data-export": "資料匯出",
  shared: "新增分帳",
};

// What the free tier vs the NT$120 unlock actually gets — keep in sync with
// the real gates: src/lib/entitlements.ts (AI quotas), accounts/actions.ts
// (account limit), shared/actions.ts + transactions/actions.ts (split
// creation), the requireCoreAccess pages, and lib/backup-snapshots.ts.
const comparisonRows: { label: string; free: string | boolean; unlocked: string | boolean }[] = [
  { label: "記帳、日曆、預算、儲蓄目標", free: true, unlocked: true },
  { label: "統計總覽、日常分析", free: true, unlocked: true },
  { label: "帳戶數量", free: "1 個", unlocked: "不限" },
  { label: "進階統計、預算與目標統計", free: false, unlocked: true },
  { label: "新增與編輯分帳", free: "僅查看、結清", unlocked: true },
  { label: "匯出 CSV／Excel／月報", free: false, unlocked: true },
  { label: "AI 記帳（文字／語音）", free: "每月 20 次", unlocked: "每月 120 次" },
  { label: "收據辨識", free: "每月 5 張", unlocked: "每月 30 張" },
  { label: "AI 生成分類圖示", free: false, unlocked: true },
  { label: "雲端備份可還原", free: "近 7 天", unlocked: "近 30 天" },
];

function ComparisonCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto size-4 text-emerald-600" strokeWidth={2.5} aria-label="有" />;
  if (value === false) return <Minus className="mx-auto size-4 text-muted-foreground/60" strokeWidth={2} aria-label="無" />;
  return <span>{value}</span>;
}

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
      aiSubscriptionPlatform: userSettings.aiSubscriptionPlatform,
      trialEndsAt: userSettings.trialEndsAt,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const unlocked = settings?.hasPurchasedCore ?? false;
  const trialEndsAt = settings?.trialEndsAt ?? null;
  const trialActive = !unlocked && isTrialActive(trialEndsAt);
  const trialDaysLeft = trialDaysRemaining(trialEndsAt);
  const isSubscribed = settings?.aiSubscriptionStatus === "active";
  // Null covers every row predating this column — those subscribers all
  // have a real stripeCustomerId, so treat null the same as "stripe".
  const aiSubscriptionPlatform = settings?.aiSubscriptionPlatform ?? "stripe";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <BackHistoryLink label="返回" />
      <h1 className="text-2xl font-semibold">升級</h1>

      {status === "success" && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-700">
          付款成功！若功能還沒立即解鎖，重新整理頁面看看。
        </div>
      )}
      {from && featureFromLabel[from] && (
        <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
          「{featureFromLabel[from]}」是核心解鎖功能，解鎖後即可使用。
        </div>
      )}

      <div className="flex flex-col divide-y">
        <section className="flex flex-col gap-3 py-4 first:pt-0">
          <h2 className="text-sm font-semibold text-muted-foreground">全部解鎖</h2>
          <p className="text-sm text-muted-foreground">
            一次性付費，不用訂閱，永久解鎖全部功能。
          </p>
          <p className="text-2xl font-semibold tabular-nums">NT$120</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 text-left font-normal">功能</th>
                <th className="w-24 py-2 text-center font-normal">免費</th>
                <th className="w-24 py-2 text-center font-semibold text-foreground">解鎖</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparisonRows.map((row) => (
                <tr key={row.label}>
                  <td className="py-2 pr-2">{row.label}</td>
                  <td className="py-2 text-center text-xs text-muted-foreground tabular-nums">
                    <ComparisonCell value={row.free} />
                  </td>
                  <td className="py-2 text-center text-xs font-medium tabular-nums">
                    <ComparisonCell value={row.unlocked} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">新帳號有 7 天全功能試用；試用結束後資料都會保留。</p>
          {unlocked ? (
            <div className="rounded-lg bg-muted px-3 py-2 text-center text-sm font-medium text-muted-foreground">
              已解鎖
            </div>
          ) : (
            <>
              {trialActive && (
                <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-center text-sm font-medium text-amber-700">
                  試用中，還剩 {trialDaysLeft} 天
                </div>
              )}
              <CoreUnlockCta purchaseCoreAction={createAllInOneCheckoutSession} />
            </>
          )}
        </section>

        {/* Only ever shown to someone who already has a real recurring AI
            subscription from before this pricing change — new purchases no
            longer offer a standalone AI subscription at all, so this
            section can't appear for a first-time buyer. */}
        {isSubscribed && (
          <section className="flex flex-col gap-3 py-4">
            <h2 className="text-sm font-semibold text-muted-foreground">AI 訂閱</h2>
            <p className="text-sm text-muted-foreground">每月訂閱，解鎖 AI 記帳與收據辨識的高額度使用。</p>
            <p className="text-2xl font-semibold tabular-nums">
              NT$30<span className="text-sm font-normal text-muted-foreground">/月</span>
            </p>
            {aiSubscriptionPlatform === "app_store" ? (
              <a
                href="itms-apps://apps.apple.com/account/subscriptions"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                前往 App Store 管理訂閱
              </a>
            ) : aiSubscriptionPlatform === "play_store" ? (
              <a
                href="https://play.google.com/store/account/subscriptions"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                前往 Google Play 管理訂閱
              </a>
            ) : (
              <form action={createBillingPortalSession}>
                <Button type="submit" variant="outline" className="w-full">
                  管理訂閱
                </Button>
              </form>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
