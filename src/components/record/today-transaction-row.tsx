"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { CategoryIconBadge } from "@/components/category-icon";
import { CategoryPill } from "@/components/transactions/category-pill";
import { OTHER_COLOR } from "@/components/stats/chart-colors";
import {
  EditTransactionDialog,
  type EditableTransaction,
} from "@/components/record/edit-transaction-dialog";
import { QuickCategoryDialog } from "@/components/record/quick-category-dialog";
import { SwipeToDelete } from "@/components/transactions/swipe-to-delete";
import { deleteTransaction, duplicateTransaction } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { formatTimeInTaipei } from "@/lib/date";
import { type AccountType } from "@/lib/account-type";

type Category = { id: string; name: string; icon: string | null; type: "income" | "expense" };
type Account = { id: string; name: string; type: AccountType };

export type TodayTransaction = {
  id: string;
  amount: string;
  exchangeRate: string;
  type: "income" | "expense";
  merchant: string | null;
  note: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  paymentMethod: string;
  accountId: string;
  accountName: string;
  occurredAt: string;
  createdAt: Date;
  isSharedExpense: boolean;
  paidByMe: boolean;
};

export function TodayTransactionRow({
  transaction: t,
  categories,
  accounts,
  showAccount,
  partnerName,
}: {
  transaction: TodayTransaction;
  categories: Category[];
  accounts: Account[];
  showAccount: boolean;
  partnerName: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);

  async function handleDelete() {
    const result = await deleteTransaction(t.id);
    if (isFail(result)) {
      toast.error(result.error);
      return;
    }
    toast.success("已刪除交易");
    router.refresh();
  }

  async function handleDuplicate() {
    const created = await duplicateTransaction(t.id);
    if (isFail(created)) {
      toast.error(created.error);
      return;
    }
    toast.success(`已複製「${t.merchant || t.note || t.categoryName || "這筆交易"}」`, {
      action: {
        label: "復原",
        onClick: async () => {
          await deleteTransaction(created.id);
          router.refresh();
        },
      },
    });
    router.refresh();
  }

  const editableTransaction: EditableTransaction = {
    id: t.id,
    type: t.type,
    amount: t.amount,
    categoryId: t.categoryId,
    paymentMethod: t.paymentMethod as EditableTransaction["paymentMethod"],
    accountId: t.accountId,
    merchant: t.merchant,
    note: t.note,
    occurredAt: t.occurredAt,
    isSharedExpense: t.isSharedExpense,
    paidByMe: t.paidByMe,
  };

  // The title falls back to merchant -> note -> category, so a note never
  // shows up there once a merchant is set — surface it here instead so an
  // edited note is never invisible just because the transaction also has a
  // merchant (this is exactly the bug a user hit: they edited 備註 and it
  // looked like nothing changed, because the title kept showing 商家).
  const noteVisible = t.merchant && t.note && t.note !== t.merchant ? t.note : null;

  // categoryName now shows as a colored CategoryPill instead of plain text
  // in this line — see below.
  const secondaryParts = [
    noteVisible,
    paymentMethodLabel(t.paymentMethod),
    showAccount ? t.accountName : null,
    formatTimeInTaipei(t.createdAt),
  ].filter(Boolean);

  return (
    <div className="relative">
      <SwipeToDelete
        actions={[
          {
            label: "複製",
            icon: <Copy className="size-4" />,
            onClick: handleDuplicate,
            className: "bg-primary/80 text-primary-foreground",
          },
          {
            label: "刪除",
            icon: <Trash2 className="size-4" />,
            onClick: handleDelete,
            className: "bg-destructive text-white",
          },
        ]}
        onTap={() => setEditOpen(true)}
        onLongPress={() => setQuickCategoryOpen(true)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <CategoryIconBadge
              icon={t.categoryIcon}
              color={t.categoryColor ?? OTHER_COLOR}
              className="h-8 w-8"
              iconClassName="h-4 w-4"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{t.merchant || t.note || t.categoryName || "（無備註）"}</span>
              <div className="flex items-center gap-1.5">
                {t.categoryName && <CategoryPill name={t.categoryName} color={t.categoryColor ?? OTHER_COLOR} />}
                <span className="text-xs text-muted-foreground">{secondaryParts.join("・")}</span>
              </div>
            </div>
          </div>
          <span
            className={
              t.type === "expense"
                ? "text-sm font-semibold text-destructive tabular-nums"
                : "text-sm font-semibold text-emerald-600 tabular-nums"
            }
          >
            {t.type === "expense" ? "-" : "+"}
            {Number(t.amount).toLocaleString("zh-TW")}
          </span>
        </div>
      </SwipeToDelete>

      <EditTransactionDialog
        transaction={editableTransaction}
        categories={categories}
        accounts={accounts}
        partnerName={partnerName}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => router.refresh()}
      />
      <QuickCategoryDialog
        transaction={{ id: t.id, type: t.type }}
        categories={categories}
        open={quickCategoryOpen}
        onOpenChange={setQuickCategoryOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
