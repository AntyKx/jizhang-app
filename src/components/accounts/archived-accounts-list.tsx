"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { unarchiveAccount } from "@/app/(app)/accounts/actions";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex flex-col gap-4">
        {accounts.map((a) => (
          <Card key={a.id} className="opacity-70">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle
                className="flex flex-1 cursor-pointer items-center gap-2 text-base"
                onClick={() => setSelected(a)}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <AccountTypeIcon type={a.type} />
                </span>
                <span>{a.name}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {accountTypeLabels[a.type]}
                </span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending && restoringId === a.id}
                onClick={() => handleUnarchive(a.id)}
              >
                {pending && restoringId === a.id ? "還原中…" : "取消封存"}
              </Button>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">
              {Number(a.currentBalance).toLocaleString("zh-TW")}
            </CardContent>
          </Card>
        ))}
      </div>

      <EditAccountDialog account={selected} onClose={() => setSelected(null)} />
    </>
  );
}
