"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { deleteTransaction, updateTransaction } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { SharedExpenseToggle } from "@/components/record/shared-expense-toggle";
import { type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { PaymentMethodField } from "@/components/record/payment-method-field";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };
type Account = { id: string; name: string; type: AccountType };

export type EditableTransaction = {
  id: string;
  type: "income" | "expense";
  amount: string;
  categoryId: string | null;
  paymentMethod: PaymentMethod;
  accountId: string;
  merchant: string | null;
  note: string | null;
  occurredAt: string;
  isSharedExpense: boolean;
  paidByMe: boolean;
};

export function EditTransactionDialog({
  transaction,
  categories,
  accounts,
  partnerName,
  open,
  onOpenChange,
  onSaved,
}: {
  transaction: EditableTransaction | null;
  categories: Category[];
  accounts: Account[];
  partnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [isSharedExpense, setIsSharedExpense] = useState(false);
  const [paidByMe, setPaidByMe] = useState(true);
  const [pending, startTransition] = useTransition();

  // Re-seed the form from `transaction` right when the dialog opens, rather
  // than on every prop change — this is a render-phase state adjustment
  // (React's documented alternative to an effect for "reset state when
  // something changes"), not a data fetch/subscription, so it belongs here
  // rather than in a useEffect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && transaction) {
      setType(transaction.type);
      setAmount(transaction.amount);
      setCategoryId(transaction.categoryId ?? "");
      setPaymentMethod(transaction.paymentMethod);
      setAccountId(transaction.accountId);
      setNote(transaction.note ?? "");
      setOccurredAt(transaction.occurredAt);
      setIsSharedExpense(transaction.isSharedExpense);
      setPaidByMe(transaction.paidByMe);
    }
  }

  const relevantCategories = categories.filter((c) => c.type === type);

  function selectAccount(account: Account) {
    setAccountId(account.id);
    setPaymentMethod(accountTypeToPaymentMethod[account.type]);
  }

  function handleSave() {
    if (!transaction || !amount || Number(amount) <= 0) return;
    startTransition(async () => {
      const result = await updateTransaction({
        id: transaction.id,
        categoryId: categoryId || null,
        type,
        amount: Number(amount),
        paymentMethod,
        accountId,
        // No UI to edit this here (see 商家 field removal) — pass the
        // original value straight through so saving other fields doesn't
        // clobber it.
        merchant: transaction.merchant,
        note: note || null,
        occurredAt,
        isSharedExpense: type === "expense" ? isSharedExpense : undefined,
        paidByMe: type === "expense" ? paidByMe : undefined,
      });
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已更新交易");
      onSaved();
      onOpenChange(false);
    });
  }

  function handleDelete() {
    if (!transaction) return;
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已刪除交易");
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯交易</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>類型</Label>
              <Select
                items={{ expense: "支出", income: "收入" }}
                value={type}
                onValueChange={(v) => {
                  if (!v || v === type) return;
                  setType(v as "income" | "expense");
                  // The old category belongs to the old type — a category
                  // is always exactly one type, so it can never be valid
                  // for the other one. Leaving it set would silently save
                  // a type/category mismatch if the user doesn't reopen the
                  // category picker.
                  setCategoryId("");
                }}
              >
                <SelectTrigger>
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
              <AmountKeypadField value={amount} onChange={setAmount} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類</Label>
            <CategoryPickerSheet categories={relevantCategories} value={categoryId} onChange={setCategoryId} />
          </div>

          {/* A partner-paid share never touches any of my accounts (see
              updateTransaction, which deletes the underlying transaction
              entirely in that case) — 付款方式/帳戶 would be misleading. */}
          {!(type === "expense" && isSharedExpense && !paidByMe) && (
            <PaymentMethodField
              accountType={accounts.find((a) => a.id === accountId)?.type}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          )}

          {accounts.length > 1 && !(type === "expense" && isSharedExpense && !paidByMe) && (
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

          {type === "expense" && (
            <SharedExpenseToggle
              checked={isSharedExpense}
              onChange={setIsSharedExpense}
              paidByMe={paidByMe}
              onPaidByMeChange={setPaidByMe}
              partnerName={partnerName}
            />
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-date">日期</Label>
            <Input
              id="edit-date"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-note">備註</Label>
            <Input id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" disabled={pending} onClick={handleDelete}>
            刪除
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={pending || !amount || Number(amount) <= 0}>
            {pending ? "儲存中…" : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
