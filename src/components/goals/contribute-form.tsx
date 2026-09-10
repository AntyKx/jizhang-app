"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { contributeToGoal } from "@/app/(app)/goals/actions";

export function ContributeForm({ goalId }: { goalId: string }) {
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <AmountKeypadField
        value={amount}
        onChange={setAmount}
        allowDecimal={false}
        className="h-8 flex-1 rounded-md text-sm font-normal"
      />
      <Button
        size="sm"
        disabled={pending || !amount}
        onClick={() =>
          startTransition(async () => {
            await contributeToGoal(goalId, Number(amount));
            setAmount("");
          })
        }
      >
        存入
      </Button>
    </div>
  );
}
