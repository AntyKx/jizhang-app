"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransaction, deleteTransaction } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { type PaymentMethod } from "@/lib/payment-methods";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { currencyAllowsDecimal } from "@/lib/currency";
import { PaymentMethodField } from "@/components/record/payment-method-field";
import { SplitExpenseField, computeSplitOverflow, type SplitParticipantDraft } from "@/components/record/split-expense-field";
import { compressImageToBase64 } from "@/lib/compress-image";
import { todayInTaipeiString } from "@/lib/date";
import { AiParsedNote } from "@/components/record/ai-parsed-note";
import { readInvoiceFromFile } from "@/lib/einvoice/find-qr";
import { InvoiceBatchScan } from "@/components/record/invoice-batch-scan";
import { dismissHint, useHintDismissed } from "@/components/onboarding/gesture-hint";
import { track } from "@/lib/analytics/track";
import { TypeToggle } from "@/components/record/type-toggle";
import { AccountChips } from "@/components/accounts/account-chips";

// 「新」 badge on 連續掃描發票 until it's opened once on this device.
const BATCH_SCAN_NEW_BADGE = "batch-scan-new";

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
  // Set when the photo's e-invoice QR code was read (see lib/einvoice).
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [alreadyRecordedOn, setAlreadyRecordedOn] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const batchScanSeen = useHintDismissed(BATCH_SCAN_NEW_BADGE);

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
    setInvoiceNumber(null);
    setAlreadyRecordedOn(null);
    try {
      const [{ base64, mediaType }, invoice] = await Promise.all([
        compressImageToBase64(file),
        readInvoiceFromFile(file),
      ]);
      const res = await fetch("/api/receipt-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, invoice }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "收據辨識次數已用完");
        }
        throw new Error("解析失敗");
      }
      const { result, invoiceNumber: scannedNumber, alreadyRecordedOn: recordedOn } = (await res.json()) as {
        result: Omit<Draft, "type">;
        invoiceNumber: string | null;
        alreadyRecordedOn: string | null;
      };
      setInvoiceNumber(scannedNumber);
      setAlreadyRecordedOn(recordedOn);
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
          : "看不太懂這張收據，幫你保留照片，手動補一下金額跟分類吧",
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
          invoiceNumber: invoiceNumber ?? undefined,
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

  if (batchMode) {
    return (
      <InvoiceBatchScan
        categories={categories}
        accounts={accounts}
        defaultAccountId={defaultAccountId}
        onDone={onDone}
        onCancel={() => setBatchMode(false)}
      />
    );
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
      {!previewUrl && (
        <p className="text-center text-xs text-muted-foreground">
          電子發票會自動讀 QR Code 的金額和品項。照片會傳給 AI 服務辨識，辨識完不會保存原始照片
        </p>
      )}
      {!previewUrl && (
        <button
          type="button"
          onClick={() => {
            dismissHint(BATCH_SCAN_NEW_BADGE);
            track("batch_scan_open");
            setBatchMode(true);
          }}
          className="flex items-center gap-3 rounded-2xl bg-muted/50 p-4 text-left transition-colors hover:bg-muted"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScanLine className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              連續掃描發票
              {!batchScanSeen && (
                <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold leading-4 text-primary-foreground">
                  新
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">一疊電子發票一次掃完，最後一起確認</span>
          </span>
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
          {parseFailed ? (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              ⚠️ 沒解析成功，請對照照片手動補金額和分類
            </p>
          ) : (
            <AiParsedNote fields={invoiceNumber ? "分類" : undefined} />
          )}
          {invoiceNumber && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <QrCode className="size-3.5" />
              金額、日期、品項已從發票 QR Code 讀取（{invoiceNumber}）
            </p>
          )}
          {alreadyRecordedOn && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
              這張發票在 {alreadyRecordedOn} 已經記過了
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>類型</Label>
              <TypeToggle
                value={draft.type}
                onChange={(v) => {
                  setDraft({ ...draft, type: v });
                  // A category always belongs to exactly one type — the
                  // previously selected one can't be valid after switching,
                  // so clear it instead of silently saving a mismatch.
                  setCategoryId("");
                }}
              />
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

          {accounts.length > 1 && (
            <div className="flex flex-col gap-2">
              <Label>帳戶</Label>
              <AccountChips
                accounts={accounts}
                value={accountId}
                onChange={(a) => {
                  setAccountId(a.id);
                  setDraft({ ...draft, paymentMethod: accountTypeToPaymentMethod[a.type] });
                }}
              />
            </div>
          )}

          <PaymentMethodField
            accountType={accounts.find((a) => a.id === accountId)?.type}
            value={draft.paymentMethod}
            onChange={(paymentMethod) => setDraft({ ...draft, paymentMethod })}
          />

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
            <Label>商家</Label>
            <Input
              value={draft.merchant ?? ""}
              onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
              placeholder="例：全聯"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>備註</Label>
            <Input
              value={draft.note ?? ""}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="例：品項、用途"
              maxLength={200}
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
              Boolean(alreadyRecordedOn) ||
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
