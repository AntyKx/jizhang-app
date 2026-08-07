"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Trash2 } from "lucide-react";
import { deleteTransaction } from "@/app/(app)/transactions/actions";
import { type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { SwipeToDelete } from "@/components/transactions/swipe-to-delete";

type Transfer = {
  id: string;
  amount: string;
  feeAmount: string;
  occurredAt: string;
  note: string | null;
  fromAccountId: string;
  toAccountId: string | null;
};
type AccountInfo = { name: string; type: AccountType };

export function TransferHistory({
  transfers,
  accountsById,
}: {
  transfers: Transfer[];
  accountsById: Record<string, AccountInfo>;
}) {
  const router = useRouter();

  async function handleDelete(id: string) {
    try {
      await deleteTransaction(id);
      toast.success("已刪除轉帳紀錄");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">轉帳紀錄</span>
      <div className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card">
        {transfers.map((t) => {
          const from = accountsById[t.fromAccountId];
          const to = t.toAccountId ? accountsById[t.toAccountId] : undefined;
          return (
            <SwipeToDelete
              key={t.id}
              actions={[
                {
                  label: "刪除",
                  icon: <Trash2 className="size-4" />,
                  onClick: () => handleDelete(t.id),
                  className: "bg-destructive text-white",
                },
              ]}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 text-sm">
                    {from ? (
                      <>
                        <AccountTypeIcon type={from.type} className="size-3.5" />
                        {from.name}
                      </>
                    ) : (
                      "（已刪除帳戶）"
                    )}
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    {to ? (
                      <>
                        <AccountTypeIcon type={to.type} className="size-3.5" />
                        {to.name}
                      </>
                    ) : (
                      "（已刪除帳戶）"
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.occurredAt}
                    {Number(t.feeAmount) > 0 ? `・手續費 ${Number(t.feeAmount).toLocaleString("zh-TW")}` : ""}
                    {t.note ? `・${t.note}` : ""}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  NT$ {Number(t.amount).toLocaleString("zh-TW")}
                </span>
              </div>
            </SwipeToDelete>
          );
        })}
      </div>
    </div>
  );
}
