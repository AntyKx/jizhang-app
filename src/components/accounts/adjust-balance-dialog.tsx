"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { adjustAccountBalance } from "@/app/(app)/accounts/actions";
import { isFail } from "@/lib/action-result";
import { initialBalanceFromInput, type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
import { cn } from "@/lib/utils";

function formatAmount(n: number) {
  return n.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

// 餘額校正: type what the bank / card app really shows, see the difference,
// confirm. The difference is booked as one "adjustment" row (not income or
// expense — see adjustAccountBalance).
export function AdjustBalanceDialog({
  open,
  onOpenChange,
  accountId,
  accountType,
  currency,
  currentBalance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountType: AccountType;
  currency: string;
  currentBalance: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  const isLoan = accountType === "loan";
  const recorded = Number(currentBalance);
  const hasValue = value !== "" && value !== "-";
  // Loans are typed as the positive amount still owed, same as the
  // account form (initialBalanceFromInput turns it back into a negative).
  const actual = hasValue ? initialBalanceFromInput(accountType, value) : null;
  const delta = actual === null ? null : Math.round((actual - recorded) * 100) / 100;

  function handleOpenChange(next: boolean) {
    if (!next) setValue("");
    onOpenChange(next);
  }

  function handleConfirm() {
    if (actual === null || delta === null || delta === 0) return;
    startTransition(async () => {
      const result = await adjustAccountBalance({ accountId, actualBalance: actual });
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已校正餘額");
      handleOpenChange(false);
      router.refresh();
    });
  }

  const currencyPrefix = currency !== "TWD" ? `${currency} ` : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>校正餘額</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{isLoan ? "App 記錄的欠款" : "App 記錄的餘額"}</span>
            <span className="font-semibold tabular-nums">
              {currencyPrefix}
              {formatAmount(isLoan ? Math.abs(recorded) : recorded)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{isLoan ? "實際剩餘欠款" : "實際餘額"}</Label>
            <AmountKeypadField
              value={value}
              onChange={setValue}
              allowDecimal={currencyAllowsDecimal(currency)}
              allowNegative={accountType === "credit_card"}
              inline
            />
            <p className="text-xs text-muted-foreground">
              {accountType === "credit_card"
                ? "輸入卡片 App 顯示的金額，有欠款請切換成負數。"
                : "輸入銀行或錢包 App 上顯示的金額。"}
            </p>
          </div>

          {delta !== null && (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                delta === 0 ? "text-muted-foreground" : "border-primary/40 bg-primary/5",
              )}
            >
              {delta === 0 ? (
                "跟 App 記錄的一樣，不需要校正"
              ) : (
                <div className="flex flex-col gap-1">
                  <span>
                    將補一筆餘額校正{" "}
                    <span className={cn("font-semibold tabular-nums", delta > 0 ? "text-emerald-600" : "text-destructive")}>
                      {delta > 0 ? "+" : "-"}
                      {formatAmount(Math.abs(delta))}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">不會算進收入或支出統計，之後在明細左滑可刪除</span>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleConfirm} disabled={pending || delta === null || delta === 0}>
            {pending ? "校正中…" : "確認校正"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
