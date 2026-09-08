"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { unarchiveAccount } from "@/app/(app)/accounts/actions";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { Button } from "@/components/ui/button";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";

type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: string;
  excludeFromNetWorth: boolean;
  initialBalance: string;
  statementDay: number | null;
};

export function ArchivedAccountsList({ accounts }: { accounts: Account[] }) {
  const [selected, setSelected] = useState<Account | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleUnarchive(id: string) {
    setRestoringId(id);
    startTransition(async () => {
      try {
        await unarchiveAccount(id);
        toast.success("已取消封存");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "取消封存失敗");
      } finally {
        setRestoringId(null);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col divide-y opacity-70">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 py-3.5">
            <div
              className="flex flex-1 cursor-pointer items-center gap-2"
              onClick={() => setSelected(a)}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <AccountTypeIcon type={a.type} />
              </span>
              <div className="flex flex-col">
                <span className="flex items-baseline gap-1.5 text-sm font-medium">
                  {a.name}
                  <span className="text-muted-foreground text-xs font-normal">
                    {accountTypeLabels[a.type]}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {Number(a.currentBalance).toLocaleString("zh-TW")}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending && restoringId === a.id}
              onClick={() => handleUnarchive(a.id)}
            >
              {pending && restoringId === a.id ? "還原中…" : "取消封存"}
            </Button>
          </div>
        ))}
      </div>

      <EditAccountDialog account={selected} onClose={() => setSelected(null)} />
    </>
  );
}
