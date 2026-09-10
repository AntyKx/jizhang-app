"use client";

import { useEffect, useState } from "react";
import { Handshake, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SplitParticipantDraft = { name: string; amount: string };

// How much 自訂金額 mode's entered amounts exceed the transaction total by
// (0 when within bounds, or when 均分 mode makes this impossible by
// construction) — exported so each of the 4 entry-point forms can fold this
// into their own "完成/確認" button's disabled condition without this
// component needing an onValidityChange callback of its own.
export function computeSplitOverflow(totalAmount: string, participants: SplitParticipantDraft[]): number {
  const total = Number(totalAmount) || 0;
  const splitTotal = participants.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  return Math.max(splitTotal - total, 0);
}

// Shared by all four expense-entry paths (manual amount sheet, edit dialog,
// AI text quick-add, receipt scan) so "分帳" looks and behaves identically
// everywhere. Always represents "I paid the full amount, these people owe me
// their share" — the reverse ("someone else paid, I owe them") doesn't
// touch any of my accounts at all, so it belongs on the /shared page's own
// standalone add-expense flow instead of hiding account/payment-method
// fields in here like the old single-partner toggle used to.
export function SplitExpenseField({
  enabled,
  onEnabledChange,
  participants,
  onParticipantsChange,
  totalAmount,
  suggestions,
}: {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  participants: SplitParticipantDraft[];
  onParticipantsChange: (next: SplitParticipantDraft[]) => void;
  // The transaction's own amount — used to compute "我的份額" and, in 均分
  // mode, each participant's default even share.
  totalAmount: string;
  suggestions: string[];
}) {
  const [method, setMethod] = useState<"equal" | "custom">("equal");
  const [nameInput, setNameInput] = useState("");

  const total = Number(totalAmount) || 0;

  // Recompute even shares whenever the participant count or the total
  // changes, but only in 均分 mode — 自訂金額 mode never overwrites what the
  // user typed. Comparing computed vs current before calling onChange keeps
  // this from looping (same array shape in, same shape out once settled).
  useEffect(() => {
    if (method !== "equal" || participants.length === 0) return;
    const share = total > 0 ? (total / (participants.length + 1)).toFixed(2) : "0";
    const next = participants.map((p) => ({ ...p, amount: share }));
    const changed = next.some((p, i) => p.amount !== participants[i].amount);
    if (changed) onParticipantsChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, participants.length, total]);

  function addParticipant(name: string) {
    const trimmed = name.trim();
    if (!trimmed || participants.some((p) => p.name === trimmed)) return;
    const share = method === "equal" && total > 0 ? (total / (participants.length + 2)).toFixed(2) : "0";
    onParticipantsChange([...participants, { name: trimmed, amount: share }]);
    setNameInput("");
  }

  function removeParticipant(index: number) {
    onParticipantsChange(participants.filter((_, i) => i !== index));
  }

  function updateAmount(index: number, amount: string) {
    onParticipantsChange(participants.map((p, i) => (i === index ? { ...p, amount } : p)));
  }

  const splitTotal = participants.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const overflow = Math.max(splitTotal - total, 0);
  const myShare = Math.max(total - splitTotal, 0);
  const unusedSuggestions = suggestions.filter((s) => !participants.some((p) => p.name === s));

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onEnabledChange(!enabled)}
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left text-sm transition-colors",
          enabled ? "bg-primary/10" : "bg-muted/60 text-muted-foreground hover:bg-muted",
        )}
      >
        <span className="flex items-center gap-1.5">
          <Handshake className="size-4 shrink-0" strokeWidth={1.75} />
          分帳（我先付，跟朋友分攤）
        </span>
        <span
          className={cn(
            "flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
            enabled ? "justify-end bg-primary" : "justify-start bg-muted-foreground/30",
          )}
        >
          <span className="m-0.5 h-4 w-4 rounded-full bg-white shadow" />
        </span>
      </button>

      {enabled && (
        <div className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-3">
          <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMethod("equal")}
              className={cn(
                "flex-1 rounded-md py-1.5 transition-colors",
                method === "equal" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              均分
            </button>
            <button
              type="button"
              onClick={() => setMethod("custom")}
              className={cn(
                "flex-1 rounded-md py-1.5 transition-colors",
                method === "custom" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              自訂金額
            </button>
          </div>

          {participants.length > 0 && (
            <div className="flex flex-col gap-2">
              {participants.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {p.name.slice(0, 1)}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                  {method === "custom" ? (
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={p.amount}
                      onChange={(e) => updateAmount(i, e.target.value)}
                      className="h-8 w-24 border-0 bg-background text-right"
                    />
                  ) : (
                    <span className="w-24 text-right text-sm font-semibold tabular-nums">
                      ${Number(p.amount).toLocaleString("zh-TW")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeParticipant(i)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addParticipant(nameInput);
                }
              }}
              placeholder="新增分帳對象"
              className="h-9 border-0 bg-background"
            />
            <button
              type="button"
              onClick={() => addParticipant(nameInput)}
              disabled={!nameInput.trim()}
              className="flex h-9 shrink-0 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              新增
            </button>
          </div>

          {unusedSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {unusedSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addParticipant(s)}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {participants.length > 0 && (
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-1 rounded-xl px-3 py-2.5",
                overflow > 0 ? "bg-destructive/10" : "bg-secondary",
              )}
            >
              <div className={cn("text-xs font-medium", overflow > 0 ? "text-destructive" : "text-secondary-foreground")}>
                {overflow > 0 ? "分帳金額超出總額" : "我的份額"}
                <span className="ml-1 opacity-70">
                  {overflow > 0 ? "，請調整金額" : `（${participants.length} 位對象分攤）`}
                </span>
              </div>
              <div
                className={cn(
                  "text-base font-extrabold tabular-nums",
                  overflow > 0 ? "text-destructive" : "text-secondary-foreground",
                )}
              >
                {overflow > 0 ? `+$${overflow.toLocaleString("zh-TW")}` : `$${myShare.toLocaleString("zh-TW")}`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
