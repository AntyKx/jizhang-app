"use client";

// TEMPORARY — admin-only preview (dev-tools page) comparing ways to keep
// the record sheet's amount field clear of the keypad panel. Mirrors the
// amount sheet in quick-add-category-flow.tsx with mock data; nothing is
// saved. Delete once a variant is chosen.

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { AccountChips } from "@/components/accounts/account-chips";
import { CategoryIconBadge } from "@/components/category-icon";
import type { AccountType } from "@/lib/account-type";

type Variant = "current" | "A" | "B" | "C";

const ACCOUNTS: { id: string; name: string; type: AccountType }[] = [
  { id: "1", name: "現金", type: "cash" },
  { id: "2", name: "國泰Cube卡", type: "credit_card" },
  { id: "3", name: "中信薪轉", type: "bank" },
];

function PreviewSheet({ variant, open, onOpenChange }: { variant: Variant; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("1");

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="max-w-none">
        <div className="flex flex-col items-center gap-1.5 py-2">
          <CategoryIconBadge icon="utensils" color={null} className="h-12 w-12" iconClassName="h-6 w-6" />
          <BottomSheetTitle className="text-lg font-medium">餐飲</BottomSheetTitle>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="sr-only">金額</Label>
          <AmountKeypadField
            value={amount}
            onChange={setAmount}
            autoOpen
            allowDecimal={false}
            inline={variant === "B"}
            reserveSpace={variant === "A" ? "end" : variant === "C" ? "none" : "below"}
            label={
              variant === "C" ? (
                <span className="inline-flex items-center gap-1.5 text-base font-medium text-foreground">
                  <CategoryIconBadge icon="utensils" color={null} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                  餐飲
                </span>
              ) : undefined
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>帳戶</Label>
          <AccountChips accounts={ACCOUNTS} value={accountId} onChange={(a) => setAccountId(a.id)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>備註（選填）</Label>
          <Input placeholder="例：跟朋友吃飯" />
        </div>

        <div className="flex flex-col gap-2">
          <Label>日期</Label>
          <Input type="date" defaultValue="2026-10-13" />
        </div>

        <div className="flex gap-2 pb-2">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
            返回
          </Button>
          <Button className="flex-1" onClick={() => toast("預覽模式，不會儲存")}>
            完成
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

// One variant, opened on load — rendered inside a phone-width iframe by
// /design-preview/keypad. Closing just reopens it, so the frame never
// ends up empty.
export function RecordKeypadPreviewFrame({ variant }: { variant: Variant }) {
  const [round, setRound] = useState(0);
  return (
    <div className="flex min-h-[100dvh] flex-col gap-3 p-4">
      <h1 className="text-2xl font-semibold">記帳</h1>
      <p className="text-sm text-muted-foreground">（背景頁面）</p>
      <PreviewSheet key={round} variant={variant} open onOpenChange={(v) => !v && setRound((r) => r + 1)} />
    </div>
  );
}
