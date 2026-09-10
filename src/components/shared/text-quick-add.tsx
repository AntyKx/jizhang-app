"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSplitExpense } from "@/app/(app)/shared/actions";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { todayInTaipeiString } from "@/lib/date";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null };

type Draft = {
  amount: number;
  categoryName: string | null;
  counterpartyName: string;
  iOwe: boolean;
  name: string;
  occurredAt: string;
};

export function SharedTextQuickAdd({
  categories,
  frequentSplitNames,
  initialText,
  onDone,
  onCancel,
}: {
  categories: Category[];
  frequentSplitNames: string[];
  initialText?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleParse(overrideText?: string) {
    const input = (overrideText ?? text).trim();
    if (!input) return;
    setParsing(true);
    setParseFailed(false);
    try {
      const res = await fetch("/api/shared-quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "AI 記帳額度已用完");
        }
        throw new Error("解析失敗");
      }
      const { result } = (await res.json()) as { result: Draft };
      setDraft(result);
      setAmountText(String(result.amount));
      const matchedCategory = categories.find((c) => c.name === result.categoryName);
      setCategoryId(matchedCategory?.id ?? "");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message !== "解析失敗"
          ? err.message
          : "AI 看不太懂，幫你保留文字，手動補一下金額吧",
      );
      setParseFailed(true);
      setCategoryId("");
      setAmountText("0");
      setDraft({
        amount: 0,
        categoryName: null,
        counterpartyName: "",
        iOwe: false,
        name: input,
        occurredAt: todayInTaipeiString(),
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
    if (!draft || !draft.counterpartyName.trim()) return;
    startTransition(async () => {
      await createSplitExpense({
        name: draft.name,
        categoryId: categoryId || undefined,
        occurredAt: draft.occurredAt,
        participants: [{ name: draft.counterpartyName.trim(), amount: draft.amount, iOwe: draft.iOwe }],
      });
      toast.success(`已新增「${draft.name} NT$${draft.amount.toLocaleString("zh-TW")}」`);
      onDone();
    });
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="shared-quick-text">輸入一句話，例如「跟小美吃晚餐 1200 元，我付的」</Label>
        <Textarea
          id="shared-quick-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="跟小美吃晚餐 1200 元，我付的"
          rows={2}
          autoFocus
        />
        <Button type="button" onClick={() => handleParse()} disabled={parsing || !text.trim()}>
          {parsing ? "解析中…" : "AI 解析"}
        </Button>
      </div>

      {draft && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          {parseFailed && (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              ⚠️ AI 沒解析成功，原文已保留在項目名稱，請手動補金額與分帳對象
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>項目</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>金額</Label>
              <AmountKeypadField
                value={amountText}
                onChange={(text) => {
                  setAmountText(text);
                  setDraft({ ...draft, amount: text === "" || text === "." ? 0 : Number(text) });
                }}
                allowDecimal={false}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>分帳對象</Label>
            <Input
              value={draft.counterpartyName}
              onChange={(e) => setDraft({ ...draft, counterpartyName: e.target.value })}
              placeholder="姓名"
              maxLength={30}
            />
            {frequentSplitNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {frequentSplitNames.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraft({ ...draft, counterpartyName: n })}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>分類（選填）</Label>
            <CategoryPickerSheet categories={categories} value={categoryId} onChange={setCategoryId} placeholder="不指定" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>方向</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, iOwe: false })}
                className={cn(
                  "flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  !draft.iOwe ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                對方欠我
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, iOwe: true })}
                className={cn(
                  "flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  draft.iOwe ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                我欠對方
              </button>
            </div>
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
            disabled={pending || !draft.amount || draft.amount <= 0 || !draft.counterpartyName.trim()}
          >
            {pending ? "儲存中…" : "確認新增"}
          </Button>
        </div>
      )}
    </div>
  );
}
