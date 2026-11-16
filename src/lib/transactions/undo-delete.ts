"use client";

import { toast } from "sonner";
import { createTransaction, createTransfer } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import type { PaymentMethod } from "@/lib/payment-methods";

type DeletedTransaction = {
  type: "income" | "expense";
  amount: string;
  categoryId: string | null;
  paymentMethod: string;
  accountId: string;
  note: string | null;
  merchant: string | null;
  occurredAt: string;
  isSharedExpense: boolean;
  splitParticipants: { name: string; amount: string }[];
};

// "已刪除" toast with a 復原 action. Deleting was the one destructive step
// with no way back (adding and duplicating both had 復原), and a swipe is
// easy to land on the wrong row. Undo re-creates the row from what the list
// already had in hand — same content, a new id. A deletable row never has a
// settled split (deleteTransaction refuses those), so re-creating its
// participants as unsettled loses nothing.
export function toastDeletedTransaction(item: DeletedTransaction, refresh: () => void) {
  toast.success("已刪除交易", {
    action: {
      label: "復原",
      onClick: async () => {
        const restored = await createTransaction({
          type: item.type,
          amount: Number(item.amount),
          categoryId: item.categoryId ?? undefined,
          paymentMethod: item.paymentMethod as PaymentMethod,
          accountId: item.accountId,
          note: item.note ?? undefined,
          merchant: item.merchant ?? undefined,
          occurredAt: item.occurredAt,
          splitParticipants:
            item.type === "expense" && item.isSharedExpense && item.splitParticipants.length > 0
              ? item.splitParticipants.map((p) => ({ name: p.name, amount: Number(p.amount) }))
              : undefined,
        });
        if (isFail(restored)) {
          toast.error(`復原失敗：${restored.error}`);
          return;
        }
        refresh();
      },
    },
  });
}

export function toastDeletedTransfer(
  item: {
    amount: string;
    feeAmount: string;
    note: string | null;
    occurredAt: string;
    fromAccountId: string;
    toAccountId: string | null;
  },
  refresh: () => void,
) {
  const toAccountId = item.toAccountId;
  // A transfer whose destination account was since deleted can't be put
  // back as a transfer — no undo offered for that one.
  if (!toAccountId) {
    toast.success("已刪除轉帳紀錄");
    return;
  }
  toast.success("已刪除轉帳紀錄", {
    action: {
      label: "復原",
      onClick: async () => {
        const restored = await createTransfer({
          fromAccountId: item.fromAccountId,
          toAccountId,
          amount: Number(item.amount),
          fee: Number(item.feeAmount) || undefined,
          note: item.note ?? undefined,
          occurredAt: item.occurredAt,
        });
        if (isFail(restored)) {
          toast.error(`復原失敗：${restored.error}`);
          return;
        }
        refresh();
      },
    },
  });
}
