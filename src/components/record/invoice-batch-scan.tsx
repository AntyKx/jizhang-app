"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Camera, Check, Images, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryPickerSheet } from "@/components/categories/category-picker-sheet";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { createTransaction } from "@/app/(app)/transactions/actions";
import { isFail } from "@/lib/action-result";
import { accountTypeToPaymentMethod, type AccountType } from "@/lib/account-type";
import { itemsToNote, parseEInvoice, type EInvoice } from "@/lib/einvoice/qr";
import { readInvoiceFromFile, scanForInvoiceCodes } from "@/lib/einvoice/find-qr";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null; type: "income" | "expense" };
type Account = { id: string; name: string; type: AccountType; currency: string };

// One scanned invoice. The raw left code is kept so a right code seen a
// moment later (live camera) can complete its item list.
type Scanned = { invoice: EInvoice; left: Uint8Array; hasRight: boolean; seenAt: number };

type ReviewRow = {
  invoice: EInvoice;
  merchant: string;
  categoryId: string;
  note: string;
  include: boolean;
  alreadyRecordedOn: string | null;
};

const SCAN_INTERVAL_MS = 250;
const PAIR_WINDOW_MS = 4000;
// /api/invoice-batch takes at most this many per request.
const BATCH_SIZE = 50;

type BatchResult = { invoiceNumber: string; merchant: string | null; categoryName: string | null; alreadyRecordedOn: string | null };

// The Android shell only grants the WebView a live camera from the build
// that added CAMERA handling to MainActivity, which marks itself in the
// user agent (capacitor.config.ts). Older builds use photos instead.
function liveCameraLikelyAvailable() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  return !Capacitor.isNativePlatform() || navigator.userAgent.includes("JizhangLiveCamera");
}

function formatAmount(n: number) {
  return `NT$${Math.round(n).toLocaleString("zh-TW")}`;
}

export function InvoiceBatchScan({
  categories,
  accounts,
  defaultAccountId,
  onDone,
  onCancel,
}: {
  categories: Category[];
  accounts: Account[];
  defaultAccountId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [scanned, setScanned] = useState<Scanned[]>([]);
  const scannedRef = useRef<Scanned[]>([]);
  const [live, setLive] = useState(liveCameraLikelyAvailable);
  const [cameraOn, setCameraOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [missed, setMissed] = useState(0);
  const [review, setReview] = useState<ReviewRow[] | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function commit(next: Scanned[]) {
    scannedRef.current = next;
    setScanned(next);
  }

  // Adds a newly seen invoice, or completes an existing one's items when its
  // right-hand code shows up. Returns true for a brand-new invoice.
  function addCodes(left: Uint8Array | null, right: Uint8Array | null): boolean {
    const list = scannedRef.current;
    if (left) {
      const invoice = parseEInvoice(left, right);
      if (!invoice) return false;
      const existing = list.find((s) => s.invoice.invoiceNumber === invoice.invoiceNumber);
      if (existing) {
        if (right && !existing.hasRight) {
          commit(list.map((s) => (s === existing ? { ...s, invoice, hasRight: true } : s)));
        }
        return false;
      }
      commit([{ invoice, left, hasRight: Boolean(right), seenAt: Date.now() }, ...list]);
      return true;
    }
    if (right) {
      // A right code on its own belongs to the invoice scanned just before it.
      const recent = list.find((s) => !s.hasRight && Date.now() - s.seenAt < PAIR_WINDOW_MS);
      const invoice = recent && parseEInvoice(recent.left, right);
      if (recent && invoice) commit(list.map((s) => (s === recent ? { ...s, invoice, hasRight: true } : s)));
    }
    return false;
  }

  function feedback() {
    navigator.vibrate?.(40);
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      toast.error("沒辦法開啟鏡頭，改用拍照或從相簿選吧");
      setLive(false);
    }
  }

  // Attach the stream once the <video> is mounted, then scan frames on a
  // timer until the camera is turned off.
  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    canvasRef.current ??= document.createElement("canvas");
    const timer = setInterval(() => {
      if (video.readyState < 2 || !video.videoWidth) return;
      const hits = scanForInvoiceCodes(video, video.videoWidth, video.videoHeight, 1280, canvasRef.current!);
      let added = false;
      if (hits.left.length > 0) {
        for (const left of hits.left) added = addCodes(left, hits.right[0] ?? null) || added;
      } else if (hits.right.length > 0) {
        addCodes(null, hits.right[0]);
      }
      if (added) feedback();
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
    // addCodes/feedback only touch refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  // Never leave the camera running behind a closed sheet.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoBusy(true);
    let added = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      const invoice = await readInvoiceFromFile(file);
      if (!invoice) {
        failed++;
        continue;
      }
      if (scannedRef.current.some((s) => s.invoice.invoiceNumber === invoice.invoiceNumber)) continue;
      commit([{ invoice, left: new Uint8Array(), hasRight: true, seenAt: Date.now() }, ...scannedRef.current]);
      added++;
    }
    setPhotoBusy(false);
    setMissed((m) => m + failed);
    if (added > 0) feedback();
    if (failed > 0) toast.message(`有 ${failed} 張沒讀到發票 QR Code，可以靠近一點再拍`);
  }

  async function goToReview() {
    stopCamera();
    setLoadingReview(true);
    const invoices = scannedRef.current.map((s) => s.invoice).reverse();
    try {
      const results: BatchResult[] = [];
      let allOk = true;
      for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
        const res = await fetch("/api/invoice-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoices: invoices.slice(i, i + BATCH_SIZE) }),
        });
        const body = (await res.json().catch(() => null)) as { results?: BatchResult[]; aiUsed?: boolean } | null;
        results.push(...(body?.results ?? []));
        if (!res.ok || !body?.aiUsed) allOk = false;
      }
      const byNumber = new Map(results.map((r) => [r.invoiceNumber, r]));
      setReview(
        invoices.map((invoice) => {
          const r = byNumber.get(invoice.invoiceNumber);
          return {
            invoice,
            merchant: r?.merchant ?? "",
            categoryId: categories.find((c) => c.type === "expense" && c.name === r?.categoryName)?.id ?? "",
            note: itemsToNote(invoice.items) ?? "",
            include: !r?.alreadyRecordedOn,
            alreadyRecordedOn: r?.alreadyRecordedOn ?? null,
          };
        }),
      );
      if (!allOk) toast.message("有些發票小熊沒能幫忙分類，請手動選一下");
    } catch {
      toast.error("網路好像不太穩，稍後再試");
    } finally {
      setLoadingReview(false);
    }
  }

  async function saveAll() {
    if (!review) return;
    const account = accounts.find((a) => a.id === accountId);
    const rows = review.filter((r) => r.include);
    setSaving(true);
    let ok = 0;
    const failures: string[] = [];
    for (const r of rows) {
      const created = await createTransaction({
        type: "expense",
        amount: r.invoice.total,
        categoryId: r.categoryId || undefined,
        paymentMethod: account ? accountTypeToPaymentMethod[account.type] : "cash",
        accountId,
        merchant: r.merchant.trim() || undefined,
        note: r.note.trim() || undefined,
        occurredAt: r.invoice.date,
        invoiceNumber: r.invoice.invoiceNumber,
      }).catch(() => null);
      if (created && !isFail(created)) ok++;
      else failures.push(r.invoice.invoiceNumber);
    }
    setSaving(false);
    router.refresh();
    if (failures.length === 0) {
      toast.success(`已記 ${ok} 筆發票`);
      onDone();
    } else {
      toast.error(`記好 ${ok} 筆，有 ${failures.length} 筆沒記成功`);
      setReview(review.filter((r) => failures.includes(r.invoice.invoiceNumber)));
    }
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");

  if (review) {
    const count = review.filter((r) => r.include).length;
    const total = review.filter((r) => r.include).reduce((s, r) => s + r.invoice.total, 0);
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setReview(null)}
          className="self-start text-sm text-muted-foreground underline underline-offset-4"
        >
          ← 繼續掃描
        </button>

        <p className="text-xs text-muted-foreground">金額、日期、品項來自發票 QR Code；商家和分類由 AI 判斷，記帳前請確認。</p>

        {accounts.length > 1 && (
          <div className="flex flex-col gap-2">
            <Label>全部記到</Label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccountId(a.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors",
                    accountId === a.id ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <AccountTypeIcon type={a.type} className="size-3.5" />
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {review.map((r, i) => {
            const update = (patch: Partial<ReviewRow>) =>
              setReview(review.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <li
                key={r.invoice.invoiceNumber}
                className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-3", !r.include && "opacity-50")}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update({ include: !r.include })}
                    aria-label={r.include ? "不記這張" : "記這張"}
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border",
                      r.include && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {r.include && <Check className="size-3.5" strokeWidth={3} />}
                  </button>
                  <span className="flex-1 text-xs text-muted-foreground tabular-nums">{r.invoice.date}</span>
                  <span className="text-base font-semibold tabular-nums">{formatAmount(r.invoice.total)}</span>
                </div>
                {r.alreadyRecordedOn && (
                  <p className="text-xs text-amber-700">這張在 {r.alreadyRecordedOn} 已經記過了</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={r.merchant}
                    onChange={(e) => update({ merchant: e.target.value })}
                    placeholder="商家"
                    className="h-8"
                  />
                  <CategoryPickerSheet
                    categories={expenseCategories}
                    value={r.categoryId}
                    onChange={(categoryId) => update({ categoryId })}
                  />
                </div>
                {r.note && <p className="line-clamp-2 text-xs text-muted-foreground">{r.note}</p>}
              </li>
            );
          })}
        </ul>

        <Button onClick={saveAll} disabled={saving || count === 0}>
          {saving ? "記帳中…" : `記帳 ${count} 筆，共 ${formatAmount(total)}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => {
          stopCamera();
          onCancel();
        }}
        className="self-start text-sm text-muted-foreground underline underline-offset-4"
      >
        ← 返回
      </button>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {live && cameraOn ? (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full object-cover" />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 border-4 transition-colors",
              flash ? "border-emerald-400" : "border-transparent",
            )}
          />
          <p className="absolute inset-x-0 bottom-0 bg-black/50 px-3 py-2 text-center text-xs text-white">
            對準發票下方的兩個 QR Code，掃到會震動一下，換下一張就好
          </p>
        </div>
      ) : live ? (
        <button
          type="button"
          onClick={startCamera}
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-10 text-muted-foreground transition-colors hover:bg-muted"
        >
          <Camera className="size-10" />
          <span className="text-sm">開啟鏡頭，連續掃描電子發票</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Camera className="size-8" />
            <span className="text-sm">拍一張</span>
          </button>
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Images className="size-8" />
            <span className="text-sm">從相簿選多張</span>
          </button>
        </div>
      )}
      {!live && (
        <p className="text-center text-xs text-muted-foreground">
          {photoBusy ? "讀取中…" : "拍清楚發票下方的 QR Code 就好，可以一張一張拍，也可以先拍好再一次選"}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">已掃描 {scanned.length} 張</span>
          {missed > 0 && <span className="text-xs text-muted-foreground">{missed} 張沒讀到</span>}
        </div>
        {scanned.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">
            只讀發票上的 QR Code，不會上傳照片
          </p>
        ) : (
          <ul className="flex max-h-60 flex-col divide-y overflow-y-auto rounded-xl border">
            {scanned.map((s) => (
              <li key={s.invoice.invoiceNumber} className="flex items-center gap-2 px-3 py-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{itemsToNote(s.invoice.items, 40) ?? s.invoice.invoiceNumber}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{s.invoice.date}</span>
                </span>
                <span className="text-sm font-medium tabular-nums">{formatAmount(s.invoice.total)}</span>
                <button
                  type="button"
                  onClick={() => commit(scannedRef.current.filter((x) => x !== s))}
                  aria-label="移除"
                  className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button onClick={goToReview} disabled={scanned.length === 0 || loadingReview}>
        {loadingReview ? "小熊正在整理…" : `完成，確認 ${scanned.length} 張`}
      </Button>
    </div>
  );
}
