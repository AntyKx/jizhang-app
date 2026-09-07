"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { Repeat2, Trash2 } from "lucide-react";
import { CategoryIconBadge } from "@/components/category-icon";
import { CategoryPill } from "@/components/transactions/category-pill";
import { OTHER_COLOR } from "@/components/stats/chart-colors";
import { BearIllustration } from "@/components/bear-illustration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StaggerList } from "@/components/motion/stagger-list";
import { PaymentMethodIcon } from "@/components/transactions/payment-method-icon";
import {
  EditTransactionDialog,
  type EditableTransaction,
} from "@/components/record/edit-transaction-dialog";
import { SwipeToDelete } from "@/components/transactions/swipe-to-delete";
import { deleteTransaction, loadMoreTransactions } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { cn } from "@/lib/utils";
import type {
  Account,
  AccountInfo,
  Category,
  ListItem,
  RegularItem,
  TransactionsCursor,
  TransactionsFilter,
  TransferListItem,
} from "@/lib/transactions/list-types";

export type { Account, AccountInfo, Category, ListItem, RegularItem, TransferListItem };

function TransferRow({
  item,
  accountsById,
}: {
  item: TransferListItem;
  accountsById: Record<string, AccountInfo>;
}) {
  const router = useRouter();

  const from = accountsById[item.fromAccountId];
  const to = item.toAccountId ? accountsById[item.toAccountId] : undefined;

  async function handleDelete() {
    const result = await deleteTransaction(item.id);
    if (isFail(result)) {
      toast.error(result.error);
      return;
    }
    toast.success("已刪除轉帳紀錄");
    router.refresh();
  }

  return (
    <SwipeToDelete
      actions={[
        {
          label: "刪除",
          icon: <Trash2 className="size-4" />,
          onClick: handleDelete,
          className: "bg-destructive text-white",
        },
      ]}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground">
            <Repeat2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="flex items-center gap-1">
                {from ? (
                  <>
                    <AccountTypeIcon type={from.type} className="size-3.5" />
                    {from.name}
                  </>
                ) : (
                  "（已刪除帳戶）"
                )}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="flex items-center gap-1">
                {to ? (
                  <>
                    <AccountTypeIcon type={to.type} className="size-3.5" />
                    {to.name}
                  </>
                ) : (
                  "（已刪除帳戶）"
                )}
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              {item.occurredAt}
              {Number(item.feeAmount) > 0 ? `・手續費 ${Number(item.feeAmount).toLocaleString("zh-TW")}` : ""}
              {item.note ? `・${item.note}` : ""}
            </span>
          </div>
        </div>
        <span className="font-semibold tabular-nums">{Number(item.amount).toLocaleString("zh-TW")}</span>
      </div>
    </SwipeToDelete>
  );
}

function RegularRow({
  item,
  onSelect,
  onDelete,
}: {
  item: RegularItem;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <SwipeToDelete
      actions={[
        {
          label: "刪除",
          icon: <Trash2 className="size-4" />,
          onClick: onDelete,
          className: "bg-destructive text-white",
        },
      ]}
      onTap={onSelect}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <CategoryIconBadge
            icon={item.categoryIcon}
            color={item.categoryColor ?? OTHER_COLOR}
            className="h-8 w-8"
            iconClassName="h-4 w-4"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.merchant || item.note || "（無備註）"}</span>
              {item.categoryName && (
                <CategoryPill name={item.categoryName} color={item.categoryColor ?? OTHER_COLOR} />
              )}
              <PaymentMethodIcon method={item.paymentMethod} className="text-muted-foreground" />
            </div>
            <span className="text-muted-foreground text-xs">
              {/* Title falls back to merchant -> note, so a note is
                  otherwise invisible whenever merchant is also set —
                  surface it here so editing 備註 always shows somewhere. */}
              {[item.merchant && item.note && item.note !== item.merchant ? item.note : null, item.occurredAt]
                .filter(Boolean)
                .join("・")}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "font-semibold tabular-nums",
            item.type === "expense" ? "text-destructive" : "text-emerald-600",
          )}
        >
          {item.type === "expense" ? "-" : "+"}
          {Number(item.amount).toLocaleString("zh-TW")}
        </span>
      </div>
    </SwipeToDelete>
  );
}

// yyyy-MM -> "2026 年 7 月" (matches the calendar page's month-header
// format), so the flat all-time list reads as scannable month blocks
// instead of one endless unlabeled feed.
function monthLabel(monthKey: string): string {
  return format(parse(monthKey, "yyyy-MM", new Date()), "yyyy 年 M 月");
}

export function TransactionsList({
  items: initialItems,
  categories,
  accounts,
  accountsById,
  initialCursor,
  partnerName,
  filter,
}: {
  items: ListItem[];
  categories: Category[];
  accounts: Account[];
  accountsById: Record<string, AccountInfo>;
  initialCursor: TransactionsCursor | null;
  partnerName: string;
  // Category/date-range narrowing carried over into "load more" so paging
  // stays inside the same filtered set the server already applied to
  // `items` — see /transactions's page.tsx.
  filter?: TransactionsFilter;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RegularItem | null>(null);
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  // `items`/`cursor` only read initialItems/initialCursor on first mount —
  // a parent re-render with a genuinely new server result (switching the
  // account's month, or any router.refresh() after a mutation) otherwise
  // left this list frozen on whatever it first loaded. Render-phase reset
  // (same pattern as EditTransactionDialog/AddSharedExpenseDialog) rather
  // than useEffect, so there's no stale-data flash before the sync runs.
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
    setCursor(initialCursor);
  }

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadMoreTransactions(cursor, filter);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "載入更多交易失敗");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDeleteRegular(id: string) {
    const result = await deleteTransaction(id);
    if (isFail(result)) {
      toast.error(result.error);
      return;
    }
    toast.success("已刪除交易");
    router.refresh();
  }

  const searchableText = (item: ListItem) =>
    item.kind === "transaction"
      ? [item.merchant, item.note, item.categoryName]
      : [item.note, accountsById[item.fromAccountId]?.name, item.toAccountId ? accountsById[item.toAccountId]?.name : null];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => searchableText(item).some((field) => field?.toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, accountsById]);

  // `filtered` is already sorted newest-first, so grouping consecutive
  // same-month items in one pass preserves that order — no separate sort
  // needed.
  const monthGroups = useMemo(() => {
    const groups: { monthKey: string; items: ListItem[] }[] = [];
    for (const item of filtered) {
      const monthKey = item.occurredAt.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last && last.monthKey === monthKey) last.items.push(item);
      else groups.push({ monthKey, items: [item] });
    }
    return groups;
  }, [filtered]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center shadow-md shadow-foreground/10">
        <BearIllustration name="spending" size={96} />
        <p className="text-muted-foreground text-sm">還沒有任何交易紀錄。</p>
      </div>
    );
  }

  const editableTransaction: EditableTransaction | null = selected
    ? {
        id: selected.id,
        type: selected.type,
        amount: selected.amount,
        categoryId: selected.categoryId,
        paymentMethod: selected.paymentMethod as EditableTransaction["paymentMethod"],
        accountId: selected.accountId,
        merchant: selected.merchant,
        note: selected.note,
        occurredAt: selected.occurredAt,
        isSharedExpense: selected.isSharedExpense,
        paidByMe: selected.paidByMe,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋商家、備註、分類或帳戶"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center shadow-md shadow-foreground/10">
          <BearIllustration name="search" size={96} />
          <p className="text-muted-foreground text-sm">找不到符合的交易。</p>
        </div>
      ) : (
        <StaggerList key={query} className="flex flex-col gap-6">
          {monthGroups.map((group) => (
            <div key={group.monthKey} className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-muted-foreground">{monthLabel(group.monthKey)}</span>
              <div className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card">
                {group.items.map((item) =>
                  item.kind === "transfer" ? (
                    <TransferRow key={item.id} item={item} accountsById={accountsById} />
                  ) : (
                    <RegularRow
                      key={item.id}
                      item={item}
                      onSelect={() => setSelected(item)}
                      onDelete={() => handleDeleteRegular(item.id)}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </StaggerList>
      )}

      {!query.trim() && cursor && (
        <Button
          variant="outline"
          disabled={loadingMore}
          onClick={handleLoadMore}
          className="self-center"
        >
          {loadingMore ? "載入中…" : "載入更多"}
        </Button>
      )}

      <EditTransactionDialog
        transaction={editableTransaction}
        categories={categories}
        accounts={accounts}
        partnerName={partnerName}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
