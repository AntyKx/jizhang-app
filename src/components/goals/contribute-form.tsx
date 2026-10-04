"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { contributeToGoal } from "@/app/(app)/goals/actions";

export function ContributeForm({
  goalId,
  goalName,
  currentAmount,
  targetAmount,
}: {
  goalId: string;
  goalName: string;
  currentAmount: number;
  targetAmount: number;
}) {
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await contributeToGoal(goalId, Number(amount));
      setAmount("");
    });
  }

  const after = currentAmount + (Number(amount) || 0);

  return (
    <div className="flex gap-2">
      <AmountKeypadField
        value={amount}
        onChange={setAmount}
        allowDecimal={false}
        label={
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">存入「{goalName}」</span>
            <span className="tabular-nums">
              {amount ? "存入後 " : "目前 "}
              {(amount ? after : currentAmount).toLocaleString("zh-TW")} / {targetAmount.toLocaleString("zh-TW")}
              {amount && after >= targetAmount ? "・達成目標" : ""}
            </span>
          </div>
        }
        confirmLabel="存入"
        onConfirm={submit}
        className="h-8 flex-1 rounded-md text-sm font-normal"
      />
      <Button
        size="sm"
        disabled={pending || !amount}
        onClick={submit}
      >
        存入
      </Button>
    </div>
  );
}
