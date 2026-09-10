"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createRecurringRule } from "@/app/(app)/subscriptions/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { PaymentMethodField } from "@/components/record/payment-method-field";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };
type Account = { id: string; name: string; type: AccountType; currency: string };

export function CreateRuleDialog({
  categories,
  accounts,
}: {
  categories: Category[];
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  // Most recurring items are auto-debited rather than paid in cash — a
  // better default than the app-wide "cash" default other amount forms use.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("auto_debit");
  const formRef = useRef<HTMLFormElement>(null);

  const relevantCategories = categories.filter((c) => c.type === type);

  function selectAccount(account: Account) {
    setAccountId(account.id);
    setPaymentMethod(accountTypeToPaymentMethod[account.type]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>新增定期項目</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增定期收支 / 訂閱</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            const result = await createRecurringRule(formData);
            if (isFail(result)) {
              toast.error(result.error);
              return;
            }
            setOpen(false);
            formRef.current?.reset();
            setAmount("");
            setType("expense");
            setCategoryId("");
            setPaymentMethod("auto_debit");
            setAccountId(accounts[0]?.id ?? "");
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">名稱</Label>
            <Input id="name" name="name" placeholder="例：Netflix 訂閱" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">類型</Label>
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
                <SelectTrigger id="type">
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
              <Label htmlFor="frequency">頻率</Label>
              <Select
                name="frequency"
                defaultValue="monthly"
                items={{ daily: "每日", weekly: "每週", monthly: "每月", yearly: "每年" }}
              >
                <SelectTrigger id="frequency">
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
              <Label htmlFor="nextOccurrence">下次日期</Label>
              <Input id="nextOccurrence" name="nextOccurrence" type="date" required />
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

          <Button type="submit" disabled={!amount || Number(amount) <= 0}>
            建立
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
