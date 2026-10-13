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
import { AccountPickerSheet } from "@/components/accounts/account-picker-sheet";
import { ArrowLeftRight } from "lucide-react";

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
          {/* Two picker buttons instead of AccountChips: with many accounts
              the chip wraps for 從 and 到 took most of the screen (a user
              with 13 accounts couldn't reach 確認). */}
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label>從</Label>
              <AccountPickerSheet
                title="從哪個帳戶轉出"
                accounts={accounts}
                value={fromId}
                onChange={(a) => {
                  setFromId(a.id);
                  if (toId === a.id || accounts.find((x) => x.id === toId)?.currency !== a.currency) {
                    // Picking the current 到 as 從 reads as "swap them".
                    const prevFrom = accounts.find((x) => x.id === fromId);
                    setToId(
                      toId === a.id && prevFrom?.currency === a.currency
                        ? fromId
                        : (accounts.find((x) => x.id !== a.id && x.currency === a.currency)?.id ?? ""),
                    );
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="對調轉出和轉入帳戶"
              className="mb-1 shrink-0 text-muted-foreground"
              // toId is only ever a same-currency account, so swapping can't
              // produce a cross-currency pair.
              disabled={!toId}
              onClick={() => {
                setFromId(toId);
                setToId(fromId);
              }}
            >
              <ArrowLeftRight className="size-4" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label>到</Label>
              <AccountPickerSheet
                title="轉入哪個帳戶"
                placeholder="沒有同幣別帳戶"
                accounts={toOptions}
                value={toId}
                onChange={(a) => setToId(a.id)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>金額</Label>
            <AmountKeypadField
              value={amount}
              onChange={setAmount}
              allowDecimal={currencyAllowsDecimal(fromCurrency)}
              className="h-12 rounded-xl text-2xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>手續費（選填）</Label>
            <AmountKeypadField
              value={fee}
              onChange={setFee}
              allowDecimal={currencyAllowsDecimal(fromCurrency)}
              className="h-12 rounded-xl text-2xl"
            />
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
