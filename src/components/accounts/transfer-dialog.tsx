"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransfer } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
import { todayInTaipeiString } from "@/lib/date";
import { AccountChips } from "@/components/accounts/account-chips";

type Account = { id: string; name: string; type: AccountType; currency: string };

export function TransferDialog({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(
    accounts.find((a) => a.id !== accounts[0]?.id && a.currency === accounts[0]?.currency)?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayInTaipeiString());
  const [pending, startTransition] = useTransition();

  function reset() {
    const first = accounts[0];
    setFromId(first?.id ?? "");
    setToId(accounts.find((a) => a.id !== first?.id && a.currency === first?.currency)?.id ?? "");
    setAmount("");
    setFee("");
    setNote("");
    setOccurredAt(todayInTaipeiString());
  }

  function handleSubmit() {
    if (!fromId || !toId || !amount || Number(amount) <= 0) return;
    startTransition(async () => {
      const result = await createTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: Number(amount),
        fee: fee ? Number(fee) : undefined,
        note: note || undefined,
        occurredAt,
      });
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已轉帳");
      reset();
      setOpen(false);
    });
  }

  const fromCurrency = accounts.find((a) => a.id === fromId)?.currency;
  const toOptions = accounts.filter((a) => a.id !== fromId && a.currency === fromCurrency);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>轉帳</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>帳戶轉帳</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>從</Label>
            <AccountChips
              accounts={accounts}
              value={fromId}
              onChange={(a) => {
                setFromId(a.id);
                if (toId === a.id || accounts.find((x) => x.id === toId)?.currency !== a.currency) {
                  setToId(accounts.find((x) => x.id !== a.id && x.currency === a.currency)?.id ?? "");
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>到</Label>
            <AccountChips accounts={toOptions} value={toId} onChange={(a) => setToId(a.id)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>金額</Label>
            <AmountKeypadField value={amount} onChange={setAmount} allowDecimal={currencyAllowsDecimal(fromCurrency)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>手續費（選填）</Label>
            <AmountKeypadField value={fee} onChange={setFee} allowDecimal={currencyAllowsDecimal(fromCurrency)} />
            <p className="text-xs text-muted-foreground">手續費只會從轉出帳戶扣除，轉入帳戶不受影響。</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-date">日期</Label>
            <Input
              id="transfer-date"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-note">備註（選填）</Label>
            <Input
              id="transfer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={pending || !amount || Number(amount) <= 0 || !toId || fromId === toId}
          >
            {pending ? "轉帳中…" : "確認轉帳"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
