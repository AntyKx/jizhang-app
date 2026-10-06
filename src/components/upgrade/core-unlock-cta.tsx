"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { PRODUCT_CATEGORY, Purchases, PURCHASES_ERROR_CODE } from "@revenuecat/purchases-capacitor";
import { Button } from "@/components/ui/button";
import { getPurchasesReady } from "@/components/native-purchases-init";
import { PLAY_STORE_URL, WEB_CHECKOUT_ENABLED } from "@/lib/billing-flags";

// Asks the server to pull this user's entitlement straight from RevenueCat
// (src/app/api/revenuecat-sync) instead of waiting on the async webhook.
async function syncEntitlement(): Promise<boolean> {
  const res = await fetch("/api/revenuecat-sync", { method: "POST" });
  if (!res.ok) return false;
  const { hasPurchasedCore } = (await res.json()) as { hasPurchasedCore?: boolean };
  return Boolean(hasPurchasedCore);
}

// Google Play requires digital content consumed inside the app to be sold
// through Play Billing, not an external processor — so the Android app
// can't just submit createAllInOneCheckoutSession's Stripe form like the
// web build does. This branches to a real RevenueCat/Play Billing purchase
// natively; src/app/api/webhooks/revenuecat/route.ts picks up the resulting
// entitlement and writes hasPurchasedCore the same way the Stripe webhook
// does for web purchases, and syncEntitlement above covers the gap until
// (or if) that webhook arrives.
export function CoreUnlockCta({ purchaseCoreAction }: { purchaseCoreAction: () => Promise<void> }) {
  const [pending, setPending] = useState<"purchase" | "restore" | null>(null);
  const router = useRouter();

  if (!Capacitor.isNativePlatform() && !WEB_CHECKOUT_ENABLED) {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-3 text-center text-sm text-muted-foreground">
        <span>目前僅開放在 Android App 內透過 Google Play 購買，買一次即可在網頁版同步使用。</span>
        <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
          前往 Google Play 下載
        </a>
      </div>
    );
  }

  if (!Capacitor.isNativePlatform()) {
    return (
      <form action={purchaseCoreAction}>
        <Button type="submit" className="w-full">
          立即解鎖
        </Button>
      </form>
    );
  }

  const handlePurchase = async () => {
    const productId = process.env.NEXT_PUBLIC_PLAY_PRODUCT_CORE_UNLOCK;
    if (!productId) {
      toast.error("購買功能尚未設定完成，請稍後再試");
      return;
    }

    setPending("purchase");
    try {
      await getPurchasesReady();
      // getProducts looks up SUBSCRIPTION products unless told otherwise —
      // core_unlock is a one-time product, so without this the lookup always
      // came back empty ("找不到商品資訊") and nobody could buy.
      const { products } = await Purchases.getProducts({
        productIdentifiers: [productId],
        type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      });
      const product = products[0];
      if (!product) {
        toast.error("找不到商品資訊，請稍後再試");
        return;
      }
      await Purchases.purchaseStoreProduct({ product });
      const unlocked = await syncEntitlement().catch(() => false);
      toast.success(unlocked ? "付款成功，已解鎖全部功能！" : "付款成功！若功能還沒立即解鎖，稍後重新整理看看");
      router.refresh();
    } catch (error) {
      const code = (error as { code?: PURCHASES_ERROR_CODE })?.code;
      if (code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        toast.error("購買失敗，請稍後再試");
      }
    } finally {
      setPending(null);
    }
  };

  // Reinstall / new phone: Play still holds the one-time purchase, this
  // re-links it to the signed-in account.
  const handleRestore = async () => {
    setPending("restore");
    try {
      await getPurchasesReady();
      await Purchases.restorePurchases();
      if (await syncEntitlement()) {
        toast.success("已恢復購買，全部功能已解鎖");
        router.refresh();
      } else {
        toast.error("這個 Google 帳號找不到可恢復的購買紀錄");
      }
    } catch {
      toast.error("恢復購買失敗，請稍後再試");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handlePurchase} disabled={pending !== null} className="w-full">
        {pending === "purchase" ? "處理中…" : "立即解鎖"}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleRestore} disabled={pending !== null}>
        {pending === "restore" ? "恢復中…" : "恢復購買"}
      </Button>
    </div>
  );
}
