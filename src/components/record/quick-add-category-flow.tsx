"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { gsap } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { createTransaction, deleteTransaction } from "@/app/(app)/transactions/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { SharedExpenseToggle } from "@/components/record/shared-expense-toggle";
import { CategoryIcon } from "@/components/category-icon";
import { StaggerList } from "@/components/motion/stagger-list";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { paymentMethods, type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { PaymentMethodIcon } from "@/components/transactions/payment-method-icon";
import { todayInTaipeiString } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

function bounceDown(e: React.PointerEvent<HTMLElement>) {
  gsap.to(e.currentTarget, { scale: 0.94, duration: 0.12, ease: "power2.out" });
}
function bounceUp(e: React.PointerEvent<HTMLElement>) {
  gsap.to(e.currentTarget, { scale: 1, duration: 0.4, ease: "back.out(2)" });
}

// Category grid ("一般記帳") + its amount entry sheet — used inline by
// quick-add-section.tsx on the home page AND opened from the global
// quick-add FAB (wrapped in an outer sheet there). `onDone` is only needed
// by the FAB wrapper, to close itself too; the home page usage doesn't
// need it since the grid isn't inside a sheet.
export function QuickAddCategoryFlow({
  categories,
  accounts,
  partnerName,
  defaultAccountId,
  defaultDate,
  onDone,
}: {
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  partnerName: string;
  // Context defaults from wherever this flow was opened — e.g. the global
  // FAB on an account's detail page (defaultAccountId) or a specific day
  // selected on /calendar (defaultDate). Omitted everywhere else, falling
  // back to the first account / today, same as before.
  defaultAccountId?: string;
  defaultDate?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toggleRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"expense" | "income">("expense");
  // `selected` stays populated through the sheet's closing animation (it's
  // only cleared in onOpenChangeComplete) — the sheet's content reads
  // selected.icon/name/type, so nulling it immediately on close would blank
  // the sheet mid-animation. `amountSheetOpen` is the actual open/closed
  // signal passed to the Drawer.
  const [selected, setSelected] = useState<QuickAddCategory | null>(null);
  const [amountSheetOpen, setAmountSheetOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSharedExpense, setIsSharedExpense] = useState(false);
  const initialAccountId = accounts.find((a) => a.id === defaultAccountId)?.id ?? accounts[0]?.id ?? "";
  const [accountId, setAccountId] = useState(initialAccountId);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    accountTypeToPaymentMethod[accounts.find((a) => a.id === initialAccountId)?.type ?? "cash"],
  );
  const [occurredAt, setOccurredAt] = useState(defaultDate ?? todayInTaipeiString());
  const [pending, startTransition] = useTransition();

  const visibleCategories = categories.filter((c) => c.type === tab);

  function reset() {
    setSelected(null);
    setAmount("");
    setNote("");
    setIsSharedExpense(false);
    const currentAccount = accounts.find((a) => a.id === accountId);
    setPaymentMethod(accountTypeToPaymentMethod[currentAccount?.type ?? "cash"]);
    setOccurredAt(defaultDate ?? todayInTaipeiString());
  }

  function openCategory(c: QuickAddCategory) {
    setSelected(c);
    setAmountSheetOpen(true);
  }

  function selectAccount(account: QuickAddAccount) {
    setAccountId(account.id);
    setPaymentMethod(accountTypeToPaymentMethod[account.type]);
  }

  function handleSave() {
    if (!selected || !amount || Number(amount) <= 0) return;
    const savedAmount = amount;
    startTransition(async () => {
      let created: { id: string };
      try {
        created = await createTransaction({
          categoryId: selected.id,
          type: selected.type,
          amount: Number(savedAmount),
          paymentMethod,
          accountId,
          note: note || undefined,
          occurredAt,
          isSharedExpense: selected.type === "expense" ? isSharedExpense : undefined,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "記帳失敗，請稍後再試");
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
        className="relative isolate flex items-center justify-center gap-2 rounded-full bg-muted p-1"
      >
        <SlidingIndicator
          activeKey={tab}
          containerRef={toggleRef}
          className="-z-10 rounded-full bg-primary shadow-sm"
        />
        <button
          type="button"
          data-key="expense"
          onClick={() => setTab("expense")}
          className={cn(
            "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
            tab === "expense" ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          支出
        </button>
        <button
          type="button"
          data-key="income"
          onClick={() => setTab("income")}
          className={cn(
            "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
            tab === "income" ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          收入
        </button>
      </div>

      <StaggerList key={tab} className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openCategory(c)}
            onPointerDown={bounceDown}
            onPointerUp={bounceUp}
            onPointerLeave={bounceUp}
            className="flex flex-col items-center gap-0.5 rounded-2xl border bg-card p-2 shadow-md shadow-foreground/10 transition-shadow hover:shadow-md"
          >
            <CategoryIcon icon={c.icon} className="h-16 w-16 text-3xl" />
            <span className="text-xs text-muted-foreground">{c.name}</span>
          </button>
        ))}
      </StaggerList>

      <BottomSheet
        open={amountSheetOpen}
        onOpenChange={setAmountSheetOpen}
        onOpenChangeComplete={(open) => {
          if (!open) reset();
        }}
      >
        <BottomSheetContent>
          {selected && (
            <>
              <div className="flex flex-col items-center gap-1 py-2">
                <CategoryIcon icon={selected.icon} className="h-14 w-14 text-5xl" />
                <BottomSheetTitle className="text-lg font-medium">{selected.name}</BottomSheetTitle>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="sr-only">金額</Label>
                <AmountKeypadField value={amount} onChange={setAmount} autoOpen />
              </div>

              <div className="flex flex-col gap-2">
                <Label>付款方式</Label>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPaymentMethod(p.value)}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                        paymentMethod === p.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <PaymentMethodIcon method={p.value} />
                      {p.label}
                    </button>
                  ))}
                </div>
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
                          "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                          accountId === a.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <AccountTypeIcon type={a.type} className="size-3.5" />
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected.type === "expense" && (
                <SharedExpenseToggle
                  checked={isSharedExpense}
                  onChange={setIsSharedExpense}
                  partnerName={partnerName}
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
                  disabled={pending || !amount || Number(amount) <= 0}
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
