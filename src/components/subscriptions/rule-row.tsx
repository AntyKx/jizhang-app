"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EditRuleDialog } from "@/components/subscriptions/edit-rule-dialog";
import { PaymentMethodIcon } from "@/components/transactions/payment-method-icon";
import type { PaymentMethod } from "@/lib/payment-methods";
import type { AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

type Rule = {
  id: string;
  name: string;
  amount: string;
  type: "income" | "expense";
  paymentMethod: PaymentMethod;
  accountId: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  nextOccurrence: string;
  categoryId: string | null;
  isSubscription: boolean;
};
type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };
type Account = { id: string; name: string; type: AccountType };

export function RuleRow({
  rule,
  categories,
  accounts,
  showAccount,
}: {
  rule: Rule;
  categories: Category[];
  accounts: Account[];
  showAccount: boolean;
}) {
  const [open, setOpen] = useState(false);
  const accountName = accounts.find((a) => a.id === rule.accountId)?.name;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{rule.name}</span>
          {rule.isSubscription && <Badge variant="outline">訂閱</Badge>}
          <PaymentMethodIcon method={rule.paymentMethod} className="text-muted-foreground" />
        </div>
        <div className="text-right text-sm">
          <div
            className={cn("tabular-nums", rule.type === "expense" ? "text-destructive" : "text-emerald-600")}
          >
            {rule.type === "expense" ? "-" : "+"}
            {Number(rule.amount).toLocaleString("zh-TW")}
          </div>
          <div className="text-muted-foreground text-xs">
            下次 {rule.nextOccurrence}
            {showAccount && accountName ? ` · ${accountName}` : ""}
          </div>
        </div>
      </button>

      <EditRuleDialog rule={rule} categories={categories} accounts={accounts} open={open} onOpenChange={setOpen} />
    </>
  );
}
