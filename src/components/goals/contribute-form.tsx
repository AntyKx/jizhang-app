"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contributeToGoal } from "@/app/(app)/goals/actions";

export function ContributeForm({ goalId }: { goalId: string }) {
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        step="0.01"
        placeholder="存入金額"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-8"
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
