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
import { createAccount } from "@/app/(app)/accounts/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { supportedCurrencies } from "@/lib/currency";
import { cn } from "@/lib/utils";

const statementDayItems = Object.fromEntries(
  Array.from({ length: 31 }, (_, i) => [String(i + 1), `${i + 1} 日`]),
);

export function CreateAccountDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AccountType>("bank");
  const [initialBalance, setInitialBalance] = useState("");
  const [excludeFromNetWorth, setExcludeFromNetWorth] = useState(false);
  const [statementDay, setStatementDay] = useState<string | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>新增帳戶</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增帳戶</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            const result = await createAccount({
              name: String(formData.get("name") ?? ""),
              type: (formData.get("type") as keyof typeof accountTypeLabels) ?? "cash",
              currency: String(formData.get("currency") ?? "TWD"),
              initialBalance: Number(initialBalance) || 0,
              excludeFromNetWorth,
              statementDay: statementDay ? Number(statementDay) : null,
            });
            if (isFail(result)) {
              toast.error(result.error);
              return;
            }
            setOpen(false);
            formRef.current?.reset();
            setInitialBalance("");
            setExcludeFromNetWorth(false);
            setType("bank");
            setStatementDay(undefined);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">名稱</Label>
            <Input id="name" name="name" maxLength={30} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">類型</Label>
            <Select
              name="type"
              defaultValue="bank"
              items={accountTypeLabels}
              onValueChange={(v) => setType(v as AccountType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(accountTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "credit_card" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="statementDay">結帳日</Label>
              <Select
                value={statementDay}
                onValueChange={(v) => setStatementDay(v ?? undefined)}
                items={statementDayItems}
              >
                <SelectTrigger id="statementDay">
                  <SelectValue placeholder="選擇結帳日" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statementDayItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="currency">幣別</Label>
            <Select name="currency" defaultValue="TWD" items={supportedCurrencies}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(supportedCurrencies).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>期初餘額</Label>
            <AmountKeypadField value={initialBalance} onChange={setInitialBalance} />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={excludeFromNetWorth}
            onClick={() => setExcludeFromNetWorth((v) => !v)}
            className={cn(
              "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
              excludeFromNetWorth ? "border-primary bg-primary/10" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="flex flex-col gap-0.5">
              <span>不記入資產</span>
              <span className="text-xs text-muted-foreground">例如定存帳戶：淨資產不計入，記帳時也不會出現可選</span>
            </span>
            <span
              className={cn(
                "flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                excludeFromNetWorth ? "justify-end bg-primary" : "justify-start bg-muted-foreground/30",
              )}
            >
              <span className="m-0.5 h-4 w-4 rounded-full bg-white shadow" />
            </span>
          </button>

          <Button type="submit">建立</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
