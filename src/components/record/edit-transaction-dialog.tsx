"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
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
import { DeleteConfirmFooter } from "@/components/ui/delete-confirm-footer";
import { deleteTransaction, updateTransaction } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { SplitExpenseField, computeSplitOverflow, type SplitParticipantDraft } from "@/components/record/split-expense-field";
import { type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { PaymentMethodField } from "@/components/record/payment-method-field";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };
type Account = { id: string; name: string; type: AccountType; currency: string };

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
  splitParticipants: { name: string; amount: string }[];
  // Any participant already settled — the split section is locked (view
  // only, same rule as shared/actions.ts's updateSplitExpense) since
  // changing amounts now would desync from the reimbursement already
  // recorded against them.
  splitLocked: boolean;
};

export function EditTransactionDialog({
  transaction,
  categories,
  accounts,
  frequentSplitNames,
  open,
  onOpenChange,
  onSaved,
}: {
  transaction: EditableTransaction | null;
  categories: Category[];
  accounts: Account[];
  frequentSplitNames: string[];
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
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipantDraft[]>([]);
  const [splitLocked, setSplitLocked] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // Re-seed the form from `transaction` right when the dialog opens, rather
  // than on every prop change — this is a render-phase state adjustment
  // (React's documented alternative to an effect for "reset state when
  // something changes"), not a data fetch/subscription, so it belongs here
  // rather than in a useEffect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setConfirmingDelete(false);
    if (open && transaction) {
      setType(transaction.type);
      // A stored amount can carry a decimal the keypad below won't let you
      // type (e.g. TWD/JPY, or any currency where currencyAllowsDecimal is
      // false for this transaction's own account) — legacy data, an FX
      // rounding artifact, or a receipt-scan/AI-parsed value. Round it here
      // so the field never displays a decimal the "." key can't produce.
      const transactionCurrency = accounts.find((a) => a.id === transaction.accountId)?.currency;
      setAmount(
        currencyAllowsDecimal(transactionCurrency)
          ? transaction.amount
          : Math.round(Number(transaction.amount)).toString(),
      );
      setCategoryId(transaction.categoryId ?? "");
      setPaymentMethod(transaction.paymentMethod);
      setAccountId(transaction.accountId);
      setNote(transaction.note ?? "");
      setOccurredAt(transaction.occurredAt);
      setIsSharedExpense(transaction.isSharedExpense);
      setSplitParticipants(transaction.splitParticipants);
      setSplitLocked(transaction.splitLocked);
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
        splitParticipants:
          type === "expense" && isSharedExpense
            ? splitParticipants.map((p) => ({ name: p.name, amount: Number(p.amount) }))
            : undefined,
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
              <AmountKeypadField
                value={amount}
                onChange={setAmount}
                allowDecimal={currencyAllowsDecimal(accounts.find((a) => a.id === accountId)?.currency)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類</Label>
            <CategoryPickerSheet categories={relevantCategories} value={categoryId} onChange={setCategoryId} />
          </div>

          <PaymentMethodField
            accountType={accounts.find((a) => a.id === accountId)?.type}
            value={paymentMethod}
            onChange={setPaymentMethod}
          />

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
                      "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors",
                      accountId === a.id
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <AccountTypeIcon type={a.type} className="size-3.5" />
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === "expense" && splitLocked && (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              已有分帳對象標記結清，分帳內容無法再編輯
            </p>
          )}

          {type === "expense" && !splitLocked && (
            <SplitExpenseField
              enabled={isSharedExpense}
              onEnabledChange={setIsSharedExpense}
              participants={splitParticipants}
              onParticipantsChange={setSplitParticipants}
              totalAmount={amount}
              suggestions={frequentSplitNames}
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

        <DeleteConfirmFooter
          confirming={confirmingDelete}
          onConfirmingChange={setConfirmingDelete}
          confirmMessage="確定要刪除這筆交易嗎？"
          onDelete={handleDelete}
          pending={pending}
        >
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              pending ||
              !amount ||
              Number(amount) <= 0 ||
              (type === "expense" && isSharedExpense && computeSplitOverflow(amount, splitParticipants) > 0)
            }
          >
            {pending ? "儲存中…" : "儲存"}
          </Button>
        </DeleteConfirmFooter>
      </DialogContent>
    </Dialog>
  );
}
