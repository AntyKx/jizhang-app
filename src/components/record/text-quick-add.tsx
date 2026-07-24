"use client";

import { useState, useTransition } from "react";
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
import { createTransaction } from "@/app/(app)/transactions/actions";
import { paymentMethods, type PaymentMethod } from "@/lib/payment-methods";
import { CategoryIcon } from "@/components/category-icon";

type Category = { id: string; name: string; icon: string | null; type: "income" | "expense" };

type Draft = {
  amount: number;
  type: "income" | "expense";
  categoryName: string | null;
  paymentMethod: PaymentMethod;
  merchant: string | null;
  note: string | null;
  occurredAt: string;
};

export function TextQuickAdd({
  categories,
  onDone,
  onCancel,
}: {
  categories: Category[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("解析失敗");
      const { result } = (await res.json()) as { result: Draft };
      setDraft(result);
      const matched = categories.find((c) => c.name === result.categoryName);
      setCategoryId(matched?.id ?? "");
    } catch {
      toast.error("AI 解析失敗，請再試一次或改用圖示記帳");
    } finally {
      setParsing(false);
    }
  }

  function handleConfirm() {
    if (!draft) return;
    startTransition(async () => {
      await createTransaction({
        categoryId: categoryId || undefined,
        type: draft.type,
        amount: draft.amount,
        paymentMethod: draft.paymentMethod,
        merchant: draft.merchant ?? undefined,
        note: draft.note ?? undefined,
        occurredAt: draft.occurredAt,
      });
      toast.success("記帳成功");
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
          onClick={handleParse}
          disabled={parsing || !text.trim()}
        >
          {parsing ? "解析中…" : "AI 解析"}
        </Button>
      </div>

      {draft && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>類型</Label>
              <Select
                items={{ expense: "支出", income: "收入" }}
                value={draft.type}
                onValueChange={(v) => v && setDraft({ ...draft, type: v as "income" | "expense" })}
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
              <Input
                type="number"
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類</Label>
            <Select
              items={Object.fromEntries(relevantCategories.map((c) => [c.id, c.name]))}
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇分類" />
              </SelectTrigger>
              <SelectContent>
                {relevantCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <CategoryIcon icon={c.icon} className="h-4 w-4" /> {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                  <span>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>商家</Label>
              <Input
                value={draft.merchant ?? ""}
                onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
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
          </div>

          <Button onClick={handleConfirm} disabled={pending}>
            {pending ? "儲存中…" : "確認記帳"}
          </Button>
        </div>
      )}
    </div>
  );
}
