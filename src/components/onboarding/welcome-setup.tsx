"use client";

import { useState } from "react";
import { CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BearIllustration } from "@/components/bear-illustration";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { cn } from "@/lib/utils";

export type WelcomeAccountType = "cash" | "bank" | "credit_card" | "e_wallet";

const accountTypes: { type: WelcomeAccountType; label: string; defaultName: string; Icon: typeof Wallet }[] = [
  { type: "cash", label: "現金", defaultName: "現金", Icon: Wallet },
  { type: "bank", label: "銀行帳戶", defaultName: "銀行帳戶", Icon: Landmark },
  { type: "credit_card", label: "信用卡", defaultName: "信用卡", Icon: CreditCard },
  { type: "e_wallet", label: "電子支付", defaultName: "電子支付", Icon: Smartphone },
];

// One-step first-login setup: which account the user mainly spends from and
// roughly how much is in it, so net worth and account balances start out
// right. Skippable — skipping keeps the auto-created default account as is.
export function WelcomeSetup({
  onComplete,
  onSkip,
  pending = false,
}: {
  onComplete: (input: { type: WelcomeAccountType; name: string; initialBalance: string }) => void;
  onSkip: () => void;
  pending?: boolean;
}) {
  const [type, setType] = useState<WelcomeAccountType>("cash");
  const [name, setName] = useState("現金");
  const [balance, setBalance] = useState("");

  function pickType(next: (typeof accountTypes)[number]) {
    // Only follow the type's default name while the user hasn't typed
    // their own — overwriting "玉山銀行" with "信用卡" would be rude.
    if (accountTypes.some((t) => t.defaultName === name) || name.trim() === "") setName(next.defaultName);
    setType(next.type);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <BearIllustration name="welcome" size={112} />
        <h2 className="text-xl font-semibold">歡迎來到小熊記帳本</h2>
        <p className="text-sm text-muted-foreground">設定你最常用的帳戶</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">類型</span>
        <div className="grid grid-cols-4 gap-2">
          {accountTypes.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => pickType(t)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-xs transition-colors",
                type === t.type ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card text-muted-foreground",
              )}
            >
              <t.Icon className="size-5" strokeWidth={1.75} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">名稱</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">目前餘額</span>
        <AmountKeypadField value={balance} onChange={setBalance} label="目前餘額" />
        <span className="text-xs text-muted-foreground">大概就好，之後可以改</span>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          className="h-12 rounded-2xl text-base"
          disabled={pending}
          onClick={() => onComplete({ type, name: name.trim() || "現金", initialBalance: balance || "0" })}
        >
          完成
        </Button>
        <Button variant="ghost" className="h-11 rounded-2xl text-muted-foreground" disabled={pending} onClick={onSkip}>
          跳過
        </Button>
      </div>
    </div>
  );
}
