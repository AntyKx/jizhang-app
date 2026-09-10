"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cancelRecurringRule, updateRecurringRule } from "@/app/(app)/subscriptions/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { PaymentMethodField } from "@/components/record/payment-method-field";
import { type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
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
type Account = { id: string; name: string; type: AccountType; currency: string };

export function EditRuleDialog({
  rule,
  categories,
  accounts,
  open,
  onOpenChange,
}: {
  rule: Rule;
  categories: Category[];
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState(rule.amount);
  const [type, setType] = useState(rule.type);
  const [categoryId, setCategoryId] = useState(rule.categoryId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(rule.paymentMethod);
  const [accountId, setAccountId] = useState(rule.accountId);
  const [pending, startTransition] = useTransition();

  const relevantCategories = categories.filter((c) => c.type === type);

  function selectAccount(account: Account) {
    setAccountId(account.id);
    setPaymentMethod(accountTypeToPaymentMethod[account.type]);
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelRecurringRule(rule.id);
      toast.success(rule.isSubscription ? "已取消訂閱" : "已刪除項目");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯定期收支 / 訂閱</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            const result = await updateRecurringRule(formData);
            if (isFail(result)) {
              toast.error(result.error);
              return;
            }
            toast.success("已更新");
            onOpenChange(false);
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="id" value={rule.id} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">名稱</Label>
            <Input id="edit-name" name="name" defaultValue={rule.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-type">類型</Label>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => {
                  if (!v || v === type) return;
                  setType(v as "income" | "expense");
                  // A category always belongs to exactly one type — the
                  // previously selected one can't be valid after switching,
                  // so clear it instead of silently saving a mismatch.
                  setCategoryId("");
                }}
                items={{ expense: "支出", income: "收入" }}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>金額</Label>
              <AmountKeypadField
                value={amount}
                onChange={setAmount}
                allowDecimal={currencyAllowsDecimal(accounts.find((a) => a.id === accountId)?.currency)}
              />
              <input type="hidden" name="amount" value={amount} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-frequency">頻率</Label>
              <Select
                name="frequency"
                defaultValue={rule.frequency}
                items={{ daily: "每日", weekly: "每週", monthly: "每月", yearly: "每年" }}
              >
                <SelectTrigger id="edit-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">每日</SelectItem>
                  <SelectItem value="weekly">每週</SelectItem>
                  <SelectItem value="monthly">每月</SelectItem>
                  <SelectItem value="yearly">每年</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-nextOccurrence">下次日期</Label>
              <Input
                id="edit-nextOccurrence"
                name="nextOccurrence"
                type="date"
                defaultValue={rule.nextOccurrence}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類（選填）</Label>
            <CategoryPickerSheet categories={relevantCategories} value={categoryId} onChange={setCategoryId} placeholder="不指定" />
            <input type="hidden" name="categoryId" value={categoryId} />
          </div>

          <div className="flex flex-col gap-2">
            <PaymentMethodField
              accountType={accounts.find((a) => a.id === accountId)?.type}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
            <input type="hidden" name="paymentMethod" value={paymentMethod} />
          </div>

          {accounts.length > 1 && (
            <div className="flex flex-col gap-2">
              <Label>帳戶</Label>
              <div className="flex flex-wrap gap-2">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectAccount(a)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      accountId === a.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <AccountTypeIcon type={a.type} className="size-3.5" />
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <input type="hidden" name="accountId" value={accountId} />

          <DialogFooter>
            <Button type="button" variant="destructive" disabled={pending} onClick={handleCancel}>
              {pending ? "處理中…" : rule.isSubscription ? "取消訂閱" : "刪除項目"}
            </Button>
            <Button type="submit">儲存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
