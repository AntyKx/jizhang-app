"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTransaction, deleteTransaction, deleteUnlinkedSharedExpense } from "@/app/(app)/transactions/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { paymentMethods, type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { PaymentMethodIcon } from "@/components/transactions/payment-method-icon";
import { SharedExpenseToggle } from "@/components/record/shared-expense-toggle";
import { todayInTaipeiString } from "@/lib/date";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; type: "income" | "expense" };
type Account = { id: string; name: string; type: AccountType };

type Draft = {
  amount: number;
  type: "income" | "expense";
  categoryName: string | null;
  paymentMethod: PaymentMethod;
  accountName: string | null;
  merchant: string | null;
  note: string | null;
  occurredAt: string;
};

export function TextQuickAdd({
  categories,
  accounts,
  defaultAccountId,
  defaultDate,
  partnerName,
  initialText,
  onDone,
  onCancel,
}: {
  categories: Category[];
  accounts: Account[];
  defaultAccountId: string;
  // Context default from wherever this flow was opened (e.g. a specific day
  // selected on /calendar) — used as the AI's "today" reference for
  // resolving relative dates in the text, and as the fallback draft's date
  // if parsing fails. Omitted (real today) everywhere else.
  defaultDate?: string;
  partnerName?: string;
  initialText?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [parsing, setParsing] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [isSharedExpense, setIsSharedExpense] = useState(false);
  const [paidByMe, setPaidByMe] = useState(true);
  const [pending, startTransition] = useTransition();

  async function handleParse(overrideText?: string) {
    const input = (overrideText ?? text).trim();
    if (!input) return;
    setParsing(true);
    setParseFailed(false);
    try {
      const res = await fetch("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, referenceDate: defaultDate }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "AI 記帳額度已用完");
        }
        throw new Error("解析失敗");
      }
      const { result } = (await res.json()) as { result: Draft };
      // Only the note field is shown/edited in this form — fold the AI's
      // merchant guess into it so that detail isn't silently dropped.
      setDraft({ ...result, note: result.note ?? result.merchant });
      setAmountText(String(result.amount));
      const matchedCategory = categories.find((c) => c.name === result.categoryName);
      setCategoryId(matchedCategory?.id ?? "");
      const matchedAccount = accounts.find((a) => a.name === result.accountName);
      setAccountId(matchedAccount?.id ?? defaultAccountId);
    } catch (err) {
      // Keep whatever the user typed and drop them into the manual-entry
      // form instead of dead-ending them back to icon-based recording.
      toast.error(
        err instanceof Error && err.message !== "解析失敗"
          ? err.message
          : "AI 看不太懂，幫你保留文字，手動補一下金額跟分類吧",
      );
      setParseFailed(true);
      setCategoryId("");
      setAccountId(defaultAccountId);
      setAmountText("0");
      setDraft({
        amount: 0,
        type: "expense",
        categoryName: null,
        paymentMethod: "cash",
        accountName: null,
        merchant: null,
        note: input,
        occurredAt: defaultDate ?? todayInTaipeiString(),
      });
    } finally {
      setParsing(false);
    }
  }

  useEffect(() => {
    if (!initialText?.trim()) return;
    const id = setTimeout(() => handleParse(initialText), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleConfirm() {
    if (!draft) return;
    // Partner-paid shared expenses don't create a real transaction (see
    // createTransaction) — captured up front so the undo action below still
    // knows which delete function to call.
    const isPartnerPaidShare = draft.type === "expense" && isSharedExpense && !paidByMe;
    startTransition(async () => {
      let created: { id: string };
      try {
        created = await createTransaction({
          categoryId: categoryId || undefined,
          type: draft.type,
          amount: draft.amount,
          paymentMethod: draft.paymentMethod,
          accountId,
          // Only `note` is shown/edited in this form (the merchant guess
          // already got folded into it back in handleParse), but the
          // merchant itself is still worth persisting on its own column —
          // it's what lets a future quick-add from the same merchant get
          // its category remembered instead of re-guessed (see
          // merchant-category-memory.ts).
          merchant: draft.merchant ?? undefined,
          note: draft.note ?? undefined,
          occurredAt: draft.occurredAt,
          isSharedExpense: draft.type === "expense" ? isSharedExpense : undefined,
          paidByMe: draft.type === "expense" ? paidByMe : undefined,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "記帳失敗，請稍後再試");
        return;
      }
      toast.success(`已新增「${draft.note || "這筆"} NT$${draft.amount.toLocaleString("zh-TW")}」`, {
        action: {
          label: "復原",
          onClick: async () => {
            if (isPartnerPaidShare) await deleteUnlinkedSharedExpense(created.id);
            else await deleteTransaction(created.id);
            router.refresh();
          },
        },
      });
      onDone();
    });
  }

  const relevantCategories = categories.filter((c) => c.type === (draft?.type ?? "expense"));

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="self-start text-sm text-muted-foreground underline underline-offset-4"
      >
        ← 返回圖示記帳
      </button>

      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-text">輸入一句話，例如「午餐 120 元 麥當勞」</Label>
        <Textarea
          id="quick-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="午餐 120 元 麥當勞"
          rows={2}
          autoFocus
        />
        <Button
          type="button"
          onClick={() => handleParse()}
          disabled={parsing || !text.trim()}
        >
          {parsing ? "解析中…" : "AI 解析"}
        </Button>
      </div>

      {draft && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          {parseFailed && (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              ⚠️ AI 沒解析成功，原文已保留在備註，請手動補金額和分類
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>類型</Label>
              <Select
                items={{ expense: "支出", income: "收入" }}
                value={draft.type}
                onValueChange={(v) => {
                  if (!v || v === draft.type) return;
                  setDraft({ ...draft, type: v as "income" | "expense" });
                  // A category always belongs to exactly one type — the
                  // previously selected one can't be valid after switching,
                  // so clear it instead of silently saving a mismatch.
                  setCategoryId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>金額</Label>
              <AmountKeypadField
                value={amountText}
                onChange={(text) => {
                  setAmountText(text);
                  setDraft({ ...draft, amount: text === "" || text === "." ? 0 : Number(text) });
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類</Label>
            <CategoryPickerSheet categories={relevantCategories} value={categoryId} onChange={setCategoryId} />
          </div>

          {/* A partner-paid share never touches any of my accounts (see
              createTransaction) — 付款方式/帳戶 would be misleading. */}
          {!(isSharedExpense && !paidByMe) && (
            <div className="flex flex-col gap-2">
              <Label>付款方式</Label>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, paymentMethod: p.value })}
                    className={
                      draft.paymentMethod === p.value
                        ? "flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-sm text-primary"
                        : "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                    }
                  >
                    <PaymentMethodIcon method={p.value} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {accounts.length > 1 && !(isSharedExpense && !paidByMe) && (
            <div className="flex flex-col gap-2">
              <Label>帳戶</Label>
              <div className="flex flex-wrap gap-2">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAccountId(a.id);
                      setDraft({ ...draft, paymentMethod: accountTypeToPaymentMethod[a.type] });
                    }}
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

          {draft.type === "expense" && partnerName && (
            <SharedExpenseToggle
              checked={isSharedExpense}
              onChange={setIsSharedExpense}
              paidByMe={paidByMe}
              onPaidByMeChange={setPaidByMe}
              partnerName={partnerName}
            />
          )}

          <div className="flex flex-col gap-2">
            <Label>備註</Label>
            <Input
              value={draft.note ?? ""}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="例：跟朋友吃飯"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>日期</Label>
            <Input
              type="date"
              value={draft.occurredAt}
              onChange={(e) => setDraft({ ...draft, occurredAt: e.target.value })}
            />
          </div>

          <Button onClick={handleConfirm} disabled={pending || !draft.amount || draft.amount <= 0}>
            {pending ? "儲存中…" : "確認記帳"}
          </Button>
        </div>
      )}
    </div>
  );
}
