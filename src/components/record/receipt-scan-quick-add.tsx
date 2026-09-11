"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTransaction, deleteTransaction } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
import { PaymentMethodField } from "@/components/record/payment-method-field";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { SplitExpenseField, computeSplitOverflow, type SplitParticipantDraft } from "@/components/record/split-expense-field";
import { compressImageToBase64 } from "@/lib/compress-image";
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
};

export function ReceiptScanQuickAdd({
  categories,
  accounts,
  defaultAccountId,
  defaultDate,
  frequentSplitNames,
  onDone,
  onCancel,
}: {
  categories: Category[];
  accounts: Account[];
  defaultAccountId: string;
  // Only used if OCR fails to read a date off the receipt — a real receipt
  // photo's printed date always takes priority over page context.
  defaultDate?: string;
  frequentSplitNames: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [parsing, setParsing] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [isSharedExpense, setIsSharedExpense] = useState(false);
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipantDraft[]>([]);
  const [pending, setPending] = useState(false);

  // Revoke the object URL when it's replaced or the component unmounts, so
  // repeated scans in one session don't leak blob URLs.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    setParsing(true);
    setParseFailed(false);
    try {
      const { base64, mediaType } = await compressImageToBase64(file);
      const res = await fetch("/api/receipt-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "AI 記帳額度已用完");
        }
        throw new Error("解析失敗");
      }
      const { result } = (await res.json()) as {
        result: Omit<Draft, "type">;
      };
      const matchedAccount = accounts.find((a) => a.name === result.accountName);
      const resolvedAccountId = matchedAccount?.id ?? defaultAccountId;
      setAccountId(resolvedAccountId);
      // OCR can read a decimal off a real receipt ("$150.50") — round it
      // away up front when the resolved account's currency doesn't take
      // decimals. Both draft.amount (what gets saved) and amountText (what
      // the keypad displays) need the same rounded value.
      const resolvedCurrency = accounts.find((a) => a.id === resolvedAccountId)?.currency;
      const roundedAmount = currencyAllowsDecimal(resolvedCurrency) ? result.amount : Math.round(result.amount);
      setDraft({ ...result, amount: roundedAmount, type: "expense" });
      setAmountText(String(roundedAmount));
      const matchedCategory = categories.find((c) => c.name === result.categoryName);
      setCategoryId(matchedCategory?.id ?? "");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message !== "解析失敗"
          ? err.message
          : "AI 看不太懂這張收據，幫你保留照片，手動補一下金額跟分類吧",
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
        note: null,
        occurredAt: defaultDate ?? todayInTaipeiString(),
      });
    } finally {
      setParsing(false);
    }
  }

  const relevantCategories = draft ? categories.filter((c) => c.type === draft.type) : [];

  function handleConfirm() {
    if (!draft) return;
    setPending(true);
    (async () => {
      try {
        const created = await createTransaction({
          categoryId: categoryId || undefined,
          type: draft.type,
          amount: draft.amount,
          paymentMethod: draft.paymentMethod,
          accountId,
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
        toast.success(`已新增「${draft.merchant || draft.note || "這筆"} NT$${draft.amount.toLocaleString("zh-TW")}」`, {
          action: {
            label: "復原",
            onClick: async () => {
              await deleteTransaction(created.id);
              router.refresh();
            },
          },
        });
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "記帳失敗，請稍後再試");
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="self-start text-sm text-muted-foreground underline underline-offset-4"
      >
        ← 返回
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />

      {!previewUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-10 text-muted-foreground transition-colors hover:bg-muted"
        >
          <Camera className="size-10" />
          <span className="text-sm">拍照或選擇收據照片</span>
        </button>
      )}

      {previewUrl && (
        <div className="relative overflow-hidden rounded-2xl border bg-card">
          <Image
            src={previewUrl}
            alt="收據照片"
            width={800}
            height={600}
            unoptimized
            className="max-h-64 w-full object-contain"
          />
          {parsing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
              解析中…
            </div>
          )}
          {!parsing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 top-2 rounded-full bg-background/90 px-3 py-1 text-xs shadow"
            >
              重新拍照
            </button>
          )}
        </div>
      )}

      {draft && !parsing && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          {parseFailed && (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              ⚠️ AI 沒解析成功，請對照照片手動補金額和分類
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
                allowDecimal={currencyAllowsDecimal(accounts.find((a) => a.id === accountId)?.currency)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類</Label>
            <CategoryPickerSheet categories={relevantCategories} value={categoryId} onChange={setCategoryId} />
          </div>

          <PaymentMethodField
            accountType={accounts.find((a) => a.id === accountId)?.type}
            value={draft.paymentMethod}
            onChange={(paymentMethod) => setDraft({ ...draft, paymentMethod })}
          />

          {accounts.length > 1 && (
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
            />
          )}

          <div className="flex flex-col gap-2">
            <Label>商家 / 備註</Label>
            <Input
              value={draft.merchant ?? draft.note ?? ""}
              onChange={(e) => setDraft({ ...draft, merchant: e.target.value, note: null })}
              placeholder="例：全聯"
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
              (isSharedExpense && computeSplitOverflow(amountText, splitParticipants) > 0)
            }
          >
            {pending ? "儲存中…" : "確認記帳"}
          </Button>
        </div>
      )}
    </div>
  );
}
