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
import { createTransaction, deleteTransaction } from "@/app/(app)/transactions/actions";
import { createSplitExpense, deleteSplitExpense } from "@/app/(app)/shared/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
import { PaymentMethodField } from "@/components/record/payment-method-field";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { SplitExpenseField, computeSplitOverflow, type SplitParticipantDraft } from "@/components/record/split-expense-field";
import { todayInTaipeiString } from "@/lib/date";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };
type Account = { id: string; name: string; type: AccountType; currency: string };

type Draft = {
  amount: number;
  type: "income" | "expense";
  categoryName: string | null;
  paymentMethod: PaymentMethod;
  accountName: string | null;
  merchant: string | null;
  note: string | null;
  occurredAt: string;
  isSharedExpense: boolean;
  splitDirection: "mine" | "theirs" | null;
  splitCounterpartyName: string | null;
  splitParticipantAmount: number | null;
};

export function TextQuickAdd({
  categories,
  accounts,
  defaultAccountId,
  defaultDate,
  frequentSplitNames,
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
  frequentSplitNames: string[];
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
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipantDraft[]>([]);
  // Only meaningful when isSharedExpense is true — "mine" (a real
  // transaction, others owe me their share) vs "theirs" (no real
  // transaction, someone else paid and I owe them — see shared/actions.ts's
  // createSplitExpense). Pre-set from the AI's own guess in handleParse,
  // same as every other field here; user can still override via
  // SplitExpenseField before confirming.
  const [sharedDirection, setSharedDirection] = useState<"mine" | "theirs">("mine");
  const [theirsCounterpartyName, setTheirsCounterpartyName] = useState("");
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
      const matchedAccount = accounts.find((a) => a.name === result.accountName);
      const resolvedAccountId = matchedAccount?.id ?? defaultAccountId;
      setAccountId(resolvedAccountId);
      const detectedIsTheirs = result.isSharedExpense && result.splitDirection === "theirs";
      // The AI can parse a decimal out of free text ("150.5元") — round it
      // away up front when the resolved account's currency doesn't take
      // decimals, same as every other amount field in this app. "對方付的"
      // has no real account involved at all (no money moves), so it's
      // always no-decimal regardless of account currency, same as the
      // 分帳 tab's own amount field. Both draft.amount (what actually gets
      // saved) and amountText (what the keypad displays) need the same
      // rounded value, or accepting the AI's guess without touching the
      // keypad would silently save the un-rounded original while the field
      // showed a rounded number.
      const resolvedCurrency = accounts.find((a) => a.id === resolvedAccountId)?.currency;
      const roundedAmount =
        !detectedIsTheirs && currencyAllowsDecimal(resolvedCurrency) ? result.amount : Math.round(result.amount);
      // Only the note field is shown/edited in this form — fold the AI's
      // merchant guess into it so that detail isn't silently dropped.
      setDraft({ ...result, amount: roundedAmount, note: result.note ?? result.merchant });
      setAmountText(String(roundedAmount));
      const matchedCategory = categories.find((c) => c.name === result.categoryName);
      setCategoryId(matchedCategory?.id ?? "");

      // Pre-set the split toggle/direction from the AI's own read of the
      // text — still just a suggestion, SplitExpenseField below lets the
      // user correct it before confirming, same as every other AI guess.
      const detectedShared = result.type === "expense" && result.isSharedExpense;
      setIsSharedExpense(detectedShared);
      if (detectedShared && result.splitDirection === "theirs") {
        setSharedDirection("theirs");
        setTheirsCounterpartyName(result.splitCounterpartyName ?? "");
        setSplitParticipants([]);
      } else if (detectedShared && result.splitDirection === "mine" && result.splitCounterpartyName) {
        setSharedDirection("mine");
        const participantAmount = Math.round(result.splitParticipantAmount ?? 0);
        setSplitParticipants(
          participantAmount > 0 ? [{ name: result.splitCounterpartyName, amount: String(participantAmount) }] : [],
        );
        setTheirsCounterpartyName("");
      } else {
        setSharedDirection("mine");
        setSplitParticipants([]);
        setTheirsCounterpartyName("");
      }
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
      setIsSharedExpense(false);
      setSplitParticipants([]);
      setSharedDirection("mine");
      setTheirsCounterpartyName("");
      setDraft({
        amount: 0,
        type: "expense",
        categoryName: null,
        paymentMethod: "cash",
        accountName: null,
        merchant: null,
        note: input,
        occurredAt: defaultDate ?? todayInTaipeiString(),
        isSharedExpense: false,
        splitDirection: null,
        splitCounterpartyName: null,
        splitParticipantAmount: null,
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

    // 對方付的 — no real transaction at all (money never left my account),
    // just a standalone IOU record. A real expense only appears later, when
    // this gets settled (see shared/actions.ts's settleParticipant). Same
    // branch as quick-add-category-flow.tsx's 分帳 tab.
    const isTheirs = draft.type === "expense" && isSharedExpense && sharedDirection === "theirs";
    if (isTheirs) {
      const counterparty = theirsCounterpartyName.trim();
      if (!counterparty) return;
      startTransition(async () => {
        const created = await createSplitExpense({
          name: draft.note?.trim() || categories.find((c) => c.id === categoryId)?.name || "分帳支出",
          categoryId: categoryId || undefined,
          occurredAt: draft.occurredAt,
          participants: [{ name: counterparty, amount: draft.amount, iOwe: true }],
        });
        if (isFail(created)) {
          toast.error(created.error);
          return;
        }
        toast.success(`已記錄「${counterparty}」付的，結清後才會出現支出明細`, {
          action: {
            label: "復原",
            onClick: async () => {
              await deleteSplitExpense(created.id);
              router.refresh();
            },
          },
        });
        onDone();
      });
      return;
    }

    startTransition(async () => {
      const created = await createTransaction({
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
        splitParticipants:
          draft.type === "expense" && isSharedExpense
            ? splitParticipants.map((p) => ({ name: p.name, amount: Number(p.amount) }))
            : undefined,
      });
      if (isFail(created)) {
        toast.error(created.error);
        return;
      }
      toast.success(`已新增「${draft.note || "這筆"} NT$${draft.amount.toLocaleString("zh-TW")}」`, {
        action: {
          label: "復原",
          onClick: async () => {
            await deleteTransaction(created.id);
            router.refresh();
          },
        },
      });
      onDone();
    });
  }

  const relevantCategories = categories.filter((c) => c.type === (draft?.type ?? "expense"));
  const isTheirs = Boolean(draft) && draft?.type === "expense" && isSharedExpense && sharedDirection === "theirs";

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
                // 對方付的 has no real account involved (no money moves), so
                // there's no currency to check — always no-decimal, matching
                // the 分帳 tab's own amount field.
                allowDecimal={isTheirs ? false : currencyAllowsDecimal(accounts.find((a) => a.id === accountId)?.currency)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類</Label>
            <CategoryPickerSheet categories={relevantCategories} value={categoryId} onChange={setCategoryId} />
          </div>

          {!isTheirs && (
            <PaymentMethodField
              accountType={accounts.find((a) => a.id === accountId)?.type}
              value={draft.paymentMethod}
              onChange={(paymentMethod) => setDraft({ ...draft, paymentMethod })}
            />
          )}

          {!isTheirs && accounts.length > 1 && (
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

          {draft.type === "expense" && (
            <SplitExpenseField
              enabled={isSharedExpense}
              onEnabledChange={setIsSharedExpense}
              participants={splitParticipants}
              onParticipantsChange={setSplitParticipants}
              totalAmount={amountText}
              suggestions={frequentSplitNames}
              allowTheirsDirection
              direction={sharedDirection}
              onDirectionChange={setSharedDirection}
              theirsCounterpartyName={theirsCounterpartyName}
              onTheirsCounterpartyNameChange={setTheirsCounterpartyName}
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

          <Button
            onClick={handleConfirm}
            disabled={
              pending ||
              !draft.amount ||
              draft.amount <= 0 ||
              (isTheirs
                ? !theirsCounterpartyName.trim()
                : isSharedExpense && computeSplitOverflow(amountText, splitParticipants) > 0)
            }
          >
            {pending ? "儲存中…" : "確認記帳"}
          </Button>
        </div>
      )}
    </div>
  );
}
