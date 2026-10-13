"use client";

// TEMPORARY — admin-only preview of the 轉帳 dialog redesign (dev-tools
// page). Mock accounts mirror a real user's 13-account setup; nothing is
// submitted. Delete once the chosen variant is baked into transfer-dialog.tsx
// and ui/dialog.tsx.

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountKeypadField } from "@/components/record/amount-keypad-field";
import { AccountChips } from "@/components/accounts/account-chips";
import { AccountPickerSheet } from "@/components/accounts/account-picker-sheet";
import type { AccountType } from "@/lib/account-type";

type Account = { id: string; name: string; type: AccountType; currency: string };

const MOCK_ACCOUNTS: Account[] = [
  ["現金", "cash"],
  ["國泰Cube卡", "credit_card"],
  ["星展信用卡", "credit_card"],
  ["中信信用卡", "credit_card"],
  ["中信薪轉", "bank"],
  ["玉山國旅卡", "credit_card"],
  ["中信投資", "bank"],
  ["富邦活存", "bank"],
  ["公職優利活存", "bank"],
  ["富邦定存", "bank"],
  ["中信定存", "bank"],
  ["投資股票", "investment"],
].map(([name, type], i) => ({ id: String(i), name, type: type as AccountType, currency: "TWD" }));

// A: keep the dialog inside the safe area (status bar / notch / home bar),
// not just 1rem from the physical screen edge. Centered within that area.
const SAFE_AREA_CONTENT =
  "max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_2rem)] top-[calc(50%_+_(env(safe-area-inset-top)_-_env(safe-area-inset-bottom))_/_2)]";

// B: title + X pinned to the top while the body scrolls.
function StickyHeader({ title }: { title: string }) {
  return (
    <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center justify-between gap-2 bg-popover px-4 pt-4 pb-1">
      <DialogTitle>{title}</DialogTitle>
      <DialogClose render={<Button variant="ghost" size="icon-sm" />}>
        <XIcon />
        <span className="sr-only">關閉</span>
      </DialogClose>
    </div>
  );
}

function CommonFields() {
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label>金額</Label>
        <AmountKeypadField value={amount} onChange={setAmount} allowDecimal={false} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>手續費（選填）</Label>
        <AmountKeypadField value={fee} onChange={setFee} allowDecimal={false} />
        <p className="text-xs text-muted-foreground">手續費只會從轉出帳戶扣除，轉入帳戶不受影響。</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>日期</Label>
        <Input type="date" defaultValue="2026-10-13" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>備註（選填）</Label>
        <Input maxLength={200} />
      </div>
    </>
  );
}

function PreviewFooter() {
  return (
    <DialogFooter>
      <Button onClick={() => toast("預覽模式，不會真的轉帳")}>確認轉帳</Button>
    </DialogFooter>
  );
}

// Current chip layout, with only fixes A + B applied.
export function TransferPreviewChips() {
  const [fromId, setFromId] = useState("0");
  const [toId, setToId] = useState("1");
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>舊版排列＋A、B 修正</DialogTrigger>
      <DialogContent showCloseButton={false} className={SAFE_AREA_CONTENT}>
        <StickyHeader title="帳戶轉帳" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>從</Label>
            <AccountChips accounts={MOCK_ACCOUNTS} value={fromId} onChange={(a) => setFromId(a.id)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>到</Label>
            <AccountChips
              accounts={MOCK_ACCOUNTS.filter((a) => a.id !== fromId)}
              value={toId}
              onChange={(a) => setToId(a.id)}
            />
          </div>
          <CommonFields />
        </div>
        <PreviewFooter />
      </DialogContent>
    </Dialog>
  );
}

// A + B + C: 從/到 as two picker buttons that open a bottom sheet.
export function TransferPreviewPicker() {
  const [fromId, setFromId] = useState("0");
  const [toId, setToId] = useState("1");
  return (
    <Dialog>
      <DialogTrigger render={<Button className="w-full" />}>新版（A＋B＋C）</DialogTrigger>
      <DialogContent showCloseButton={false} className={SAFE_AREA_CONTENT}>
        <StickyHeader title="帳戶轉帳" />
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label>從</Label>
              <AccountPickerSheet
                title="從哪個帳戶轉出"
                accounts={MOCK_ACCOUNTS}
                value={fromId}
                onChange={(a) => {
                  setFromId(a.id);
                  if (a.id === toId) setToId(fromId);
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="對調轉出和轉入帳戶"
              className="mb-1 shrink-0 text-muted-foreground"
              onClick={() => {
                setFromId(toId);
                setToId(fromId);
              }}
            >
              <ArrowLeftRight className="size-4" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label>到</Label>
              <AccountPickerSheet
                title="轉入哪個帳戶"
                accounts={MOCK_ACCOUNTS.filter((a) => a.id !== fromId)}
                value={toId}
                onChange={(a) => setToId(a.id)}
              />
            </div>
          </div>
          <CommonFields />
        </div>
        <PreviewFooter />
      </DialogContent>
    </Dialog>
  );
}
