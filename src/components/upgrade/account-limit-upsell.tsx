"use client";

import Link from "next/link";
import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";
import { track } from "@/lib/analytics/track";

const EXAMPLES = [
  { icon: Banknote, label: "現金" },
  { icon: Landmark, label: "銀行" },
  { icon: CreditCard, label: "信用卡" },
  { icon: Smartphone, label: "電子錢包" },
];

// Shown in place of the new-account form once a free user already has their
// one account. Sells the outcome (each balance right, net worth at a glance)
// rather than "multi-account is a paid feature".
export function AccountLimitUpsell() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        {EXAMPLES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 py-2.5 text-xs text-muted-foreground">
            <Icon className="size-5 text-primary" />
            {label}
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <li>・每個帳戶各自算餘額，跟存摺、App 對得起來</li>
        <li>・信用卡設定結帳日，這期刷了多少一目了然</li>
        <li>・淨資產自動加總，資產負債一眼看清</li>
        <li>・帳戶之間可以記轉帳，不會重複算支出</li>
      </ul>
      <p className="text-xs text-muted-foreground">免費版可使用 1 個帳戶，解鎖後不限數量。</p>
      <Link
        href="/upgrade?from=accounts"
        onClick={() => track("account_limit_unlock_tap")}
        className="flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground active:bg-primary/80"
      >
        NT$120 一次買斷，永久解鎖
      </Link>
    </div>
  );
}
