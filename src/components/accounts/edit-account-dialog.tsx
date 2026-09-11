"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAccount } from "@/app/(app)/accounts/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
import { cn } from "@/lib/utils";

type Account = {
  id: string;
  name: string;
  type: AccountType;
  excludeFromNetWorth: boolean;
  initialBalance: string;
  currency: string;
  statementDay: number | null;
};

const statementDayItems = Object.fromEntries(
  Array.from({ length: 31 }, (_, i) => [String(i + 1), `${i + 1} 日`]),
);

export function EditAccountDialog({
  account,
  onClose,
}: {
  account: Account | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("cash");
  const [excludeFromNetWorth, setExcludeFromNetWorth] = useState(false);
  const [initialBalance, setInitialBalance] = useState("");
  const [statementDay, setStatementDay] = useState<string | undefined>(undefined);
  const [prevAccount, setPrevAccount] = useState(account);
  const [pending, startTransition] = useTransition();

  if (account !== prevAccount) {
    setPrevAccount(account);
    if (account) {
      setName(account.name);
      setType(account.type);
      setExcludeFromNetWorth(account.excludeFromNetWorth);
      // Round away any legacy decimal when this currency doesn't take one —
      // allowDecimal only removes the "." key for new input, it doesn't
      // retroactively reformat an existing stored value.
      setInitialBalance(
        currencyAllowsDecimal(account.currency)
          ? account.initialBalance
          : Math.round(Number(account.initialBalance)).toString(),
      );
      setStatementDay(account.statementDay != null ? String(account.statementDay) : undefined);
    }
  }

  function handleSave() {
    if (!account || !name.trim() || !initialBalance) return;
    startTransition(async () => {
      const result = await updateAccount({
        id: account.id,
        name: name.trim(),
        type,
        excludeFromNetWorth,
        initialBalance: Number(initialBalance),
        statementDay: statementDay ? Number(statementDay) : null,
      });
      if (isFail(result)) {
        toast.error(result.error);
        return;
      }
      toast.success("已更新帳戶");
      onClose();
    });
  }

  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>編輯帳戶</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-account-name">名稱</Label>
            <Input
              id="edit-account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-account-type">類型</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AccountType)}
              items={accountTypeLabels}
            >
              <SelectTrigger id="edit-account-type">
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
              <Label htmlFor="edit-account-statement-day">結帳日</Label>
              <Select
                value={statementDay}
                onValueChange={(v) => setStatementDay(v ?? undefined)}
                items={statementDayItems}
              >
                <SelectTrigger id="edit-account-statement-day">
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
            <Label>期初餘額</Label>
            <AmountKeypadField value={initialBalance} onChange={setInitialBalance} allowDecimal={currencyAllowsDecimal(account?.currency)} />
            <p className="text-xs text-muted-foreground">
              修改這裡不會動到已經記錄的交易，只會依調整的差額更新目前餘額。
            </p>
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

          <Button onClick={handleSave} disabled={pending || !name.trim() || !initialBalance}>
            {pending ? "儲存中…" : "儲存變更"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
