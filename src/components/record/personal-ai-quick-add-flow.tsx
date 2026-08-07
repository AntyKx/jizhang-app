"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { TextQuickAdd } from "@/components/record/text-quick-add";
import { ReceiptScanQuickAdd } from "@/components/record/receipt-scan-quick-add";
import { QuickAddBar } from "@/components/record/quick-add-bar";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

// "AI 記帳" — the text/voice/receipt-scan pill plus its two draft-editing
// sheets. Used inline on the home page by quick-add-section.tsx
// (`initialShowText`/`initialShowScan` seed from the home page's own
// app-shortcut query param) and also opened from the global quick-add FAB
// on any other page (no initial-open, plain `onClose` so the FAB can
// dismiss its own wrapping sheet once this is done or canceled).
export function PersonalAiQuickAddFlow({
  categories,
  accounts,
  defaultAccountId,
  defaultDate,
  partnerName,
  initialShowText = false,
  initialShowScan = false,
  onClose,
}: {
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  defaultAccountId: string;
  defaultDate?: string;
  partnerName: string;
  initialShowText?: boolean;
  initialShowScan?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [showText, setShowText] = useState(initialShowText);
  const [showReceiptScan, setShowReceiptScan] = useState(initialShowScan);
  const [quickText, setQuickText] = useState("");

  return (
    <>
      <QuickAddBar
        onSubmit={(text) => {
          setQuickText(text);
          setShowText(true);
        }}
        onScanReceipt={() => setShowReceiptScan(true)}
      />

      <BottomSheet open={showText} onOpenChange={setShowText}>
        <BottomSheetContent>
          <BottomSheetTitle className="sr-only">一句話快速記帳</BottomSheetTitle>
          <TextQuickAdd
            categories={categories}
            accounts={accounts}
            defaultAccountId={defaultAccountId}
            defaultDate={defaultDate}
            partnerName={partnerName}
            initialText={quickText}
            onDone={() => {
              setShowText(false);
              setQuickText("");
              router.refresh();
              onClose?.();
            }}
            onCancel={() => {
              setShowText(false);
              setQuickText("");
              onClose?.();
            }}
          />
        </BottomSheetContent>
      </BottomSheet>

      <BottomSheet open={showReceiptScan} onOpenChange={setShowReceiptScan}>
        <BottomSheetContent>
          <BottomSheetTitle className="sr-only">拍照掃收據</BottomSheetTitle>
          <ReceiptScanQuickAdd
            categories={categories}
            accounts={accounts}
            defaultAccountId={defaultAccountId}
            defaultDate={defaultDate}
            partnerName={partnerName}
            onDone={() => {
              setShowReceiptScan(false);
              router.refresh();
              onClose?.();
            }}
            onCancel={() => {
              setShowReceiptScan(false);
              onClose?.();
            }}
          />
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
