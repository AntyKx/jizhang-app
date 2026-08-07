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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTransfer } from "@/app/(app)/transactions/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { todayInTaipeiString } from "@/lib/date";

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
      try {
        await createTransfer({
          fromAccountId: fromId,
          toAccountId: toId,
          amount: Number(amount),
          fee: fee ? Number(fee) : undefined,
          note: note || undefined,
          occurredAt,
        });
        toast.success("已轉帳");
        reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "轉帳失敗");
      }
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>從</Label>
              <Select
                value={fromId}
                onValueChange={(v) => {
                  if (!v) return;
                  setFromId(v);
                  const newFromCurrency = accounts.find((a) => a.id === v)?.currency;
                  if (toId === v || accounts.find((a) => a.id === toId)?.currency !== newFromCurrency) {
                    setToId(accounts.find((a) => a.id !== v && a.currency === newFromCurrency)?.id ?? "");
                  }
                }}
                items={Object.fromEntries(accounts.map((a) => [a.id, a.name]))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-1.5">
                        <AccountTypeIcon type={a.type} className="size-3.5" />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>到</Label>
              <Select
                value={toId}
                onValueChange={(v) => v && setToId(v)}
                items={Object.fromEntries(toOptions.map((a) => [a.id, a.name]))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-1.5">
                        <AccountTypeIcon type={a.type} className="size-3.5" />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>金額</Label>
            <AmountKeypadField value={amount} onChange={setAmount} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>手續費（選填）</Label>
            <AmountKeypadField value={fee} onChange={setFee} />
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
