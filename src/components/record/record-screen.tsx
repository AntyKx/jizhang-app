"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransaction } from "@/app/(app)/transactions/actions";
import { TextQuickAdd } from "@/components/record/text-quick-add";
import { CategoryIcon } from "@/components/category-icon";
import {
  paymentMethodIcon,
  paymentMethodLabel,
  paymentMethods,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; type: "income" | "expense" };
type TodayTransaction = {
  id: string;
  amount: string;
  type: string;
  merchant: string | null;
  note: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  paymentMethod: string;
};

export function RecordScreen({
  categories,
  todayTransactions,
}: {
  categories: Category[];
  todayTransactions: TodayTransaction[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [selected, setSelected] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [showText, setShowText] = useState(false);
  const [pending, startTransition] = useTransition();

  const visibleCategories = categories.filter((c) => c.type === tab);

  function reset() {
    setSelected(null);
    setAmount("");
    setNote("");
    setPaymentMethod("cash");
    setOccurredAt(new Date().toISOString().slice(0, 10));
  }

  function handleSave() {
    if (!selected || !amount || Number(amount) <= 0) return;
    startTransition(async () => {
      await createTransaction({
        categoryId: selected.id,
        type: selected.type,
        amount: Number(amount),
        paymentMethod,
        note: note || undefined,
        occurredAt,
      });
      toast.success(`已記一筆 ${selected.icon ?? ""} ${selected.name}`);
      reset();
      router.refresh();
    });
  }

  if (showText) {
    return (
      <TextQuickAdd
        categories={categories}
        onDone={() => {
          setShowText(false);
          router.refresh();
        }}
        onCancel={() => setShowText(false)}
      />
    );
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1 py-2">
          <CategoryIcon icon={selected.icon} className="h-14 w-14 text-5xl" />
          <span className="text-lg font-medium">{selected.name}</span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="amount" className="sr-only">
            金額
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            autoFocus
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-16 rounded-2xl text-center text-3xl font-semibold"
          />
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
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

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

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setSelected(null)}>
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-2 rounded-full bg-muted p-1">
        <button
          type="button"
          onClick={() => setTab("expense")}
          className={cn(
            "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
            tab === "expense"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => setTab("income")}
          className={cn(
            "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
            tab === "income"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          收入
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c)}
            className="flex flex-col items-center gap-0.5 rounded-2xl border bg-card p-2 transition-transform hover:-translate-y-0.5 hover:shadow-md active:scale-95"
          >
            <CategoryIcon icon={c.icon} className="h-16 w-16 text-3xl" />
            <span className="text-xs text-muted-foreground">{c.name}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowText(true)}
        className="text-center text-sm text-muted-foreground underline underline-offset-4"
      >
        ✍️ 用一句話快速記帳（AI 解析）
      </button>

      {todayTransactions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">今天記了 {todayTransactions.length} 筆</span>
          <div className="flex flex-col divide-y rounded-2xl border bg-card">
            {todayTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <CategoryIcon icon={t.categoryIcon} className="h-6 w-6 text-xl" />
                  <span className="text-sm">{t.merchant || t.note || t.categoryName || "（無備註）"}</span>
                  <span className="text-xs" title={paymentMethodLabel(t.paymentMethod)}>
                    {paymentMethodIcon(t.paymentMethod)}
                  </span>
                </div>
                <span
                  className={
                    t.type === "expense"
                      ? "text-sm font-semibold text-destructive"
                      : "text-sm font-semibold text-emerald-600"
                  }
                >
                  {t.type === "expense" ? "-" : "+"}
                  {Number(t.amount).toLocaleString("zh-TW")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
