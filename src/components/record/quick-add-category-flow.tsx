"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { gsap } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { createTransaction, deleteTransaction } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { currencyAllowsDecimal } from "@/lib/currency";
import { SplitExpenseField, computeSplitOverflow, type SplitParticipantDraft } from "@/components/record/split-expense-field";
import { CategoryIconBadge } from "@/components/category-icon";
import { categoryDisplayName } from "@/lib/category-display-name";
import { StaggerList } from "@/components/motion/stagger-list";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { PaymentMethodField } from "@/components/record/payment-method-field";
import { todayInTaipeiString } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

function bounceDown(e: React.PointerEvent<HTMLElement>) {
  gsap.to(e.currentTarget, { scale: 0.94, duration: 0.12, ease: "power2.out" });
}
function bounceUp(e: React.PointerEvent<HTMLElement>) {
  gsap.to(e.currentTarget, { scale: 1, duration: 0.4, ease: "back.out(2)" });
}

// Keeps the home page's category grid to a fixed 2-row/5-column block (10
// cells) no matter how many categories exist — up to 9 real categories fill
// cells 1-9 in order, and "其他" (opening the full-list sheet) is pinned to
// the 10th cell via explicit grid placement below, always in the
// bottom-right corner. Fewer than 9 categories just leaves the remaining
// cells before "其他" blank rather than reflowing/centering — same as
// leaving unfilled slots empty in the reference layout this was modeled on.
const CATEGORY_PREVIEW_COUNT = 9;

// Category grid ("一般記帳") + its amount entry sheet — used inline by
// quick-add-section.tsx on the home page AND opened from the global
// quick-add FAB (wrapped in an outer sheet there). `onDone` is only needed
// by the FAB wrapper, to close itself too; the home page usage doesn't
// need it since the grid isn't inside a sheet.
export function QuickAddCategoryFlow({
  categories,
  accounts,
  frequentSplitNames,
  defaultAccountId,
  defaultDate,
  onDone,
  enableSharedTab = false,
  sharedLocked = false,
}: {
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  frequentSplitNames: string[];
  // Context defaults from wherever this flow was opened — e.g. the global
  // FAB on an account's detail page (defaultAccountId) or a specific day
  // selected on /calendar (defaultDate). Omitted everywhere else, falling
  // back to the first account / today, same as before.
  defaultAccountId?: string;
  defaultDate?: string;
  onDone?: () => void;
  // Adds a third "分帳" segment next to 支出/收入 — used only on the home
  // page, where it replaces the standalone 分帳記帳 button. It reuses the
  // expense category list (a shared expense is always an expense) and just
  // pre-checks the existing SplitExpenseField below, rather than being a
  // separate entry flow.
  enableSharedTab?: boolean;
  sharedLocked?: boolean;
}) {
  const router = useRouter();
  const toggleRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"expense" | "income" | "shared">("expense");
  // `selected` stays populated through the sheet's closing animation (it's
  // only cleared in onOpenChangeComplete) — the sheet's content reads
  // selected.icon/name/type, so nulling it immediately on close would blank
  // the sheet mid-animation. `amountSheetOpen` is the actual open/closed
  // signal passed to the Drawer.
  const [selected, setSelected] = useState<QuickAddCategory | null>(null);
  const [amountSheetOpen, setAmountSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSharedExpense, setIsSharedExpense] = useState(false);
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipantDraft[]>([]);
  const initialAccountId = accounts.find((a) => a.id === defaultAccountId)?.id ?? accounts[0]?.id ?? "";
  const [accountId, setAccountId] = useState(initialAccountId);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    accountTypeToPaymentMethod[accounts.find((a) => a.id === initialAccountId)?.type ?? "cash"],
  );
  const [occurredAt, setOccurredAt] = useState(defaultDate ?? todayInTaipeiString());
  const [pending, startTransition] = useTransition();

  // "分帳" reuses the expense category list — 分類就照支出設定的分類.
  const visibleCategories = categories.filter((c) => c.type === (tab === "shared" ? "expense" : tab));
  // Order here is whatever /categories' drag-to-reorder already set
  // (sortOrder) — reused as-is as "常用在前" rather than inventing a
  // separate favorites concept, so putting a category first in the
  // management page is the same action as putting it first on this grid.
  const previewCategories = visibleCategories.slice(0, CATEGORY_PREVIEW_COUNT);

  function reset() {
    setSelected(null);
    setAmount("");
    setNote("");
    setIsSharedExpense(false);
    setSplitParticipants([]);
    const currentAccount = accounts.find((a) => a.id === accountId);
    setPaymentMethod(accountTypeToPaymentMethod[currentAccount?.type ?? "cash"]);
    setOccurredAt(defaultDate ?? todayInTaipeiString());
  }

  function selectTab(next: "expense" | "income" | "shared") {
    if (next === "shared" && sharedLocked) {
      router.push("/upgrade?from=shared");
      return;
    }
    setTab(next);
  }

  function openCategory(c: QuickAddCategory) {
    setSelected(c);
    // Pre-check the shared-expense toggle when opened from the 分帳 tab —
    // still just a personal expense transaction under the hood, so the
    // toggle stays visible/editable below in case they change their mind.
    setIsSharedExpense(tab === "shared");
    setAmountSheetOpen(true);
  }

  // Picking from the "其他" overflow sheet closes that sheet first — the
  // amount sheet opening underneath while it's still animating shut would
  // otherwise show both stacked briefly.
  function pickFromMore(c: QuickAddCategory) {
    setMoreOpen(false);
    openCategory(c);
  }

  function selectAccount(account: QuickAddAccount) {
    setAccountId(account.id);
    setPaymentMethod(accountTypeToPaymentMethod[account.type]);
  }

  function handleSave() {
    if (!selected || !amount || Number(amount) <= 0) return;
    const savedAmount = amount;
    startTransition(async () => {
      const created = await createTransaction({
        categoryId: selected.id,
        type: selected.type,
        amount: Number(savedAmount),
        paymentMethod,
        accountId,
        note: note || undefined,
        occurredAt,
        splitParticipants:
          selected.type === "expense" && isSharedExpense
            ? splitParticipants.map((p) => ({ name: p.name, amount: Number(p.amount) }))
            : undefined,
      });
      if (isFail(created)) {
        toast.error(created.error);
        return;
      }
      toast.success(`已新增「${selected.name} NT$${Number(savedAmount).toLocaleString("zh-TW")}」`, {
        action: {
          label: "復原",
          onClick: async () => {
            await deleteTransaction(created.id);
            router.refresh();
          },
        },
      });
      setAmountSheetOpen(false);
      router.refresh();
      onDone?.();
    });
  }

  return (
    <>
      <div
        ref={toggleRef}
        className="relative isolate flex h-12 items-center justify-center gap-1 rounded-xl bg-muted p-1"
      >
        <SlidingIndicator
          activeKey={tab}
          containerRef={toggleRef}
          className="-z-10 rounded-lg bg-primary shadow-[0_4px_10px_-4px_var(--primary)]"
        />
        <button
          type="button"
          data-key="expense"
          onClick={() => selectTab("expense")}
          className={cn(
            "flex h-full flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors",
            tab === "expense" ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          支出
        </button>
        <button
          type="button"
          data-key="income"
          onClick={() => selectTab("income")}
          className={cn(
            "flex h-full flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors",
            tab === "income" ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          收入
        </button>
        {enableSharedTab && (
          <button
            type="button"
            data-key="shared"
            onClick={() => selectTab("shared")}
            className={cn(
              "flex h-full flex-1 items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors",
              tab === "shared" ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            分帳
            {sharedLocked && <Lock className="size-3" strokeWidth={2} />}
          </button>
        )}
      </div>

      <StaggerList key={tab} className="grid grid-cols-5 gap-x-1 gap-y-4">
        {previewCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openCategory(c)}
            onPointerDown={bounceDown}
            onPointerUp={bounceUp}
            onPointerLeave={bounceUp}
            className="flex flex-col items-center gap-1.5 rounded-lg p-1 sm:hover:bg-muted/50"
          >
            <CategoryIconBadge
              icon={c.icon}
              color={c.color}
              className="h-[54px] w-[54px]"
              iconClassName="h-[22px] w-[22px]"
            />
            <span className="line-clamp-2 text-center text-[11.5px] font-medium leading-tight text-muted-foreground">
              {categoryDisplayName(c.name)}
            </span>
          </button>
        ))}
        {/* Pinned to the grid's 10th cell (row 2, col 5) regardless of how
            many real categories rendered above — always the fixed
            bottom-right corner tile, never sliding up to sit right after
            the last category. */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          onPointerDown={bounceDown}
          onPointerUp={bounceUp}
          onPointerLeave={bounceUp}
          style={{ gridColumn: 5, gridRow: 2 }}
          className="flex flex-col items-center gap-1.5 rounded-lg p-1 sm:hover:bg-muted/50"
        >
          <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={1.8} />
          </span>
          <span className="text-center text-[11.5px] font-medium leading-tight text-muted-foreground">其他</span>
        </button>
      </StaggerList>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen}>
        <BottomSheetContent>
          <BottomSheetTitle>選擇分類</BottomSheetTitle>
          <div className="grid grid-cols-5 gap-x-1 gap-y-4 sm:grid-cols-6">
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickFromMore(c)}
                className="flex flex-col items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-muted/50"
              >
                <CategoryIconBadge
                  icon={c.icon}
                  color={c.color}
                  className="h-[54px] w-[54px]"
                  iconClassName="h-[22px] w-[22px]"
                />
                <span className="line-clamp-2 text-center text-[11.5px] font-medium leading-tight text-muted-foreground">
                  {categoryDisplayName(c.name)}
                </span>
              </button>
            ))}
          </div>
        </BottomSheetContent>
      </BottomSheet>

      <BottomSheet
        open={amountSheetOpen}
        onOpenChange={setAmountSheetOpen}
        onOpenChangeComplete={(open) => {
          if (!open) reset();
        }}
      >
        <BottomSheetContent className="max-w-none">
          {selected && (
            <>
              <div className="flex flex-col items-center gap-1.5 py-2">
                <CategoryIconBadge icon={selected.icon} color={selected.color} className="h-12 w-12" iconClassName="h-6 w-6" />
                <BottomSheetTitle className="text-lg font-medium">{selected.name}</BottomSheetTitle>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="sr-only">金額</Label>
                <AmountKeypadField
                  value={amount}
                  onChange={setAmount}
                  autoOpen
                  allowDecimal={currencyAllowsDecimal(accounts.find((a) => a.id === accountId)?.currency)}
                />
              </div>

              {accounts.length > 1 && (
                <div className="flex flex-col gap-2">
                  <Label>帳戶</Label>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => selectAccount(a)}
                        className={cn(
                          "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors",
                          accountId === a.id
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <AccountTypeIcon type={a.type} className="size-3.5" />
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <PaymentMethodField
                accountType={accounts.find((a) => a.id === accountId)?.type}
                value={paymentMethod}
                onChange={setPaymentMethod}
              />

              {selected.type === "expense" && (
                <SplitExpenseField
                  enabled={isSharedExpense}
                  onEnabledChange={setIsSharedExpense}
                  participants={splitParticipants}
                  onParticipantsChange={setSplitParticipants}
                  totalAmount={amount}
                  suggestions={frequentSplitNames}
                />
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="note">備註（選填）</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例：跟朋友吃飯"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="occurredAt">日期</Label>
                <Input
                  id="occurredAt"
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pb-2">
                <Button variant="ghost" className="flex-1" onClick={() => setAmountSheetOpen(false)}>
                  返回
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    pending ||
                    !amount ||
                    Number(amount) <= 0 ||
                    (isSharedExpense && computeSplitOverflow(amount, splitParticipants) > 0)
                  }
                  onClick={handleSave}
                >
                  {pending ? "儲存中…" : "完成"}
                </Button>
              </div>
            </>
          )}
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
