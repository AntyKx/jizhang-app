"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ChevronDown, Pencil } from "lucide-react";
import { unarchiveAccount } from "@/app/(app)/accounts/actions";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";
import { SwipeToDelete } from "@/components/transactions/swipe-to-delete";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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

function ArchivedRows({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Account | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
      <div className="flex flex-col divide-y">
        {accounts.map((a) => {
          const balance = Number(a.currentBalance);
          return (
            <SwipeToDelete
              key={a.id}
              disabled={restoringId === a.id}
              onTap={() => router.push(`/accounts/${a.id}`)}
              actions={[
                {
                  label: "編輯",
                  icon: <Pencil className="size-4" />,
                  onClick: () => setSelected(a),
                  className: "bg-secondary text-secondary-foreground",
                },
                {
                  label: restoringId === a.id ? "還原中" : "還原",
                  icon: <ArchiveRestore className="size-4" />,
                  onClick: () => handleUnarchive(a.id),
                  className: "bg-primary text-primary-foreground",
                },
              ]}
            >
              <div className="flex items-center gap-2.5 px-1 py-2.5 text-muted-foreground">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[30%] bg-muted">
                  <AccountTypeIcon type={a.type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="block truncate text-xs">{accountTypeLabels[a.type]}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {a.currency !== "TWD" && <span className="mr-1 text-xs font-normal">{a.currency}</span>}
                  {balance.toLocaleString("zh-TW")}
                </span>
              </div>
            </SwipeToDelete>
          );
        })}
      </div>

      <EditAccountDialog account={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// Archived accounts tuck under the active list as one collapsed group,
// styled like the per-type group headers above it, instead of a link to a
// separate page — they stay one tap away without crowding the main list.
export function ArchivedAccountsSection({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="-mt-2 flex flex-col">
      <CollapsibleTrigger className="justify-between px-1 py-2.5 text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <Archive className="size-3.5" />
          已封存 {accounts.length}
        </span>
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <ArchivedRows accounts={accounts} />
        <p className="px-1 pt-1 pb-2 text-xs text-muted-foreground">
          封存的帳戶不計入資產，也不會出現在記帳選單。左滑可還原。
        </p>
      </CollapsiblePanel>
    </Collapsible>
  );
}

export function ArchivedAccountsList({ accounts }: { accounts: Account[] }) {
  return <ArchivedRows accounts={accounts} />;
}
