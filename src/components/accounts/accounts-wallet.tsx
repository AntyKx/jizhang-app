"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, CreditCard, List, Loader2, Pencil } from "lucide-react";
import { getAccountCardSummary } from "@/app/(app)/accounts/actions";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Rollout switch for the wallet view on /accounts. While false, only the
// dev-admin account sees it (accounts/page.tsx); flip to true to give it to
// everyone.
export const WALLET_FOR_EVERYONE = false;

type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: string;
  excludeFromNetWorth: boolean;
  initialBalance: string;
  statementDay: number | null;
};

type Summary = Awaited<ReturnType<typeof getAccountCardSummary>>;

// Same grouping order as AccountsList, so both views list accounts alike.
const TYPE_ORDER: AccountType[] = ["cash", "credit_card", "bank", "e_wallet", "investment", "loan"];

// Every card is a tone of the active theme's --primary (relative color
// syntax), so the stack follows whichever theme is on. Lightness is fixed per
// tone rather than taken from the theme so white text always reads, even on
// themes with a pale primary (星空夜's gold).
// [lightness start, lightness end, chroma factor, hue shift]
const TONES: Record<AccountType, [number, number, number, number]> = {
  bank: [0.64, 0.5, 1, 0],
  cash: [0.72, 0.58, 0.85, -18],
  credit_card: [0.48, 0.34, 0.7, 12],
  e_wallet: [0.66, 0.52, 0.95, 32],
  investment: [0.6, 0.46, 0.4, 0],
  loan: [0.42, 0.3, 0.5, -10],
};

function cardBg(type: AccountType) {
  const [l1, l2, c, h] = TONES[type];
  const tone = (l: number) => `oklch(from var(--primary) ${l} calc(c * ${c}) calc(h + ${h}))`;
  return `linear-gradient(135deg, ${tone(l1)}, ${tone(l2)})`;
}

function money(n: number, currency: string) {
  const body = Math.abs(Math.round(n * 100) / 100).toLocaleString("zh-TW");
  return `${n < 0 ? "-" : ""}${currency === "TWD" ? "NT$" : currency} ${body}`;
}

const CARD_H = 196;
const PEEK = 58; // collapsed: how much of each card shows
const PILE_PEEK = 14; // one card out: how much of each card in the pile shows
const ACTIONS_H = 52; // the 明細/編輯 row between the open card and the pile

export function AccountsWallet({ accounts }: { accounts: Account[] }) {
  const items = TYPE_ORDER.flatMap((t) => accounts.filter((a) => a.type === t));
  const [selected, setSelected] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, Summary | "loading" | "error">>({});
  const [editing, setEditing] = useState<Account | null>(null);

  const selIndex = items.findIndex((a) => a.id === selected);
  const open = selIndex >= 0;
  const height = open
    ? CARD_H + ACTIONS_H + (items.length - 1) * PILE_PEEK + (items.length > 1 ? CARD_H - PILE_PEEK : 0)
    : PEEK * (items.length - 1) + CARD_H;

  async function loadSummary(id: string) {
    if (summaries[id] && summaries[id] !== "error") return;
    setSummaries((s) => ({ ...s, [id]: "loading" }));
    try {
      const data = await getAccountCardSummary(id);
      setSummaries((s) => ({ ...s, [id]: data }));
    } catch {
      setSummaries((s) => ({ ...s, [id]: "error" }));
    }
  }

  function tap(id: string) {
    if (selected === id) {
      if (!flipped) loadSummary(id);
      setFlipped((f) => !f);
    } else {
      setSelected(id);
      setFlipped(false);
    }
  }

  const selectedAccount = open ? items[selIndex] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-6 items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {open ? (flipped ? "點卡片翻回正面" : "再點一下卡片看本月收支") : "點一張卡片拿出來"}
        </span>
        {open && (
          <button
            type="button"
            className="text-xs font-medium text-primary"
            onClick={() => {
              setSelected(null);
              setFlipped(false);
            }}
          >
            收起
          </button>
        )}
      </div>

      <div className="relative transition-[height] duration-500" style={{ height }}>
        {selectedAccount && (
          <div
            className="absolute inset-x-0 flex gap-2 transition-opacity duration-300"
            style={{ top: CARD_H + 8 }}
          >
            <Link
              href={`/accounts/${selectedAccount.id}`}
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border bg-card text-sm font-medium"
            >
              查看明細 <ChevronRight className="size-4" />
            </Link>
            <Button variant="outline" className="h-9 flex-1 rounded-xl" onClick={() => setEditing(selectedAccount)}>
              <Pencil /> 編輯
            </Button>
          </div>
        )}

        {items.map((a, i) => {
          const isSel = a.id === selected;
          let y: number;
          let scale = 1;
          if (!open) y = i * PEEK;
          else if (isSel) y = 0;
          else {
            const j = i < selIndex ? i : i - 1;
            y = CARD_H + ACTIONS_H + j * PILE_PEEK;
            scale = 0.94 + Math.min(j, 4) * 0.012;
          }
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => tap(a.id)}
              aria-label={`${a.name}，${money(Number(a.currentBalance), a.currency)}`}
              className="absolute inset-x-0 top-0 [perspective:1200px]"
              style={{
                height: CARD_H,
                zIndex: isSel ? 50 : i + 1,
                transform: `translateY(${y}px) scale(${scale})`,
                transition: "transform 550ms cubic-bezier(.3,1.25,.4,1)",
              }}
            >
              <div
                className="relative size-full transition-transform duration-700 [transform-style:preserve-3d]"
                style={{ transform: isSel && flipped ? "rotateY(180deg)" : "none" }}
              >
                <CardFront a={a} />
                {isSel && <CardBack a={a} summary={summaries[a.id]} />}
              </div>
            </button>
          );
        })}
      </div>

      <EditAccountDialog account={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CardFront({ a }: { a: Account }) {
  const balance = Number(a.currentBalance);
  const notes = [
    accountTypeLabels[a.type],
    a.type === "credit_card" && a.statementDay != null ? `結帳日 每月 ${a.statementDay} 日` : null,
    a.excludeFromNetWorth ? "不記入資產" : null,
  ].filter(Boolean);
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-left text-white shadow-[0_-2px_10px_rgba(0,0,0,0.12),0_10px_24px_-10px_rgba(0,0,0,0.45)] [backface-visibility:hidden]"
      style={{ background: cardBg(a.type) }}
    >
      <span className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/15" />
      <span className="pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-black/10" />
      <div className="relative flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20">
            <AccountTypeIcon type={a.type} className="size-4" />
          </span>
          <span className="truncate">{a.name}</span>
        </span>
        <span className="shrink-0 text-base font-bold tabular-nums">{money(balance, a.currency)}</span>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <span className="truncate text-xs text-white/75">{notes.join("・")}</span>
        <span className="shrink-0 text-[10px] tracking-widest text-white/60">小熊記帳本</span>
      </div>
    </div>
  );
}

function CardBack({ a, summary }: { a: Account; summary: Summary | "loading" | "error" | undefined }) {
  return (
    <div className="absolute inset-0 flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
      <span className="truncate text-sm font-semibold">{a.name}・本月</span>
      {summary === undefined || summary === "loading" ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : summary === "error" ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          讀取失敗，翻回去再試一次
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted px-3 py-1.5">
              <div className="text-[10.5px] text-muted-foreground">收入</div>
              <div className="truncate text-sm font-semibold text-income tabular-nums">
                {money(summary.monthIncome, a.currency)}
              </div>
            </div>
            <div className="rounded-xl bg-muted px-3 py-1.5">
              <div className="text-[10.5px] text-muted-foreground">支出</div>
              <div className="truncate text-sm font-semibold text-destructive tabular-nums">
                {money(summary.monthExpense, a.currency)}
              </div>
            </div>
          </div>
          {summary.recent.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">還沒有收支紀錄</div>
          ) : (
            <div className="flex flex-col divide-y text-xs">
              {summary.recent.map((r) => (
                <div key={r.id} className="flex justify-between gap-2 py-1">
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground">{r.date.slice(5).replace("-", "/")}</span> {r.label}
                  </span>
                  <span className={cn("shrink-0 tabular-nums", r.amount < 0 ? "text-destructive" : "text-income")}>
                    {r.amount > 0 ? "+" : ""}
                    {r.amount.toLocaleString("zh-TW")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 卡片 / 清單 toggle above the accounts. The choice is per-device
// (localStorage), like the theme. The list keeps reorder/archive; the wallet
// is for looking.
const VIEW_KEY = "jz-accounts-view";
const VIEW_EVENT = "jz-accounts-view";
function subscribeView(cb: () => void) {
  window.addEventListener(VIEW_EVENT, cb);
  return () => window.removeEventListener(VIEW_EVENT, cb);
}

export function AccountsViewSwitch({ accounts, list }: { accounts: Account[]; list: React.ReactNode }) {
  const view = useSyncExternalStore(
    subscribeView,
    () => (localStorage.getItem(VIEW_KEY) === "list" ? "list" : "wallet"),
    () => "wallet" as const,
  );
  const setView = (v: "wallet" | "list") => {
    localStorage.setItem(VIEW_KEY, v);
    window.dispatchEvent(new Event(VIEW_EVENT));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex self-end rounded-full bg-muted p-0.5 text-xs">
        {(
          [
            ["wallet", "卡片", CreditCard],
            ["list", "清單", List],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            aria-pressed={view === k}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-colors",
              view === k ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>
      {view === "wallet" ? <AccountsWallet accounts={accounts} /> : list}
    </div>
  );
}
