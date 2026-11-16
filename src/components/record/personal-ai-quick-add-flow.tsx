"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { TextQuickAdd } from "@/components/record/text-quick-add";
import { ReceiptScanQuickAdd } from "@/components/record/receipt-scan-quick-add";
import { QuickAddBar } from "@/components/record/quick-add-bar";
import { QUICK_ADD_TRY_EVENT } from "@/components/onboarding/first-record-prompt";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

// "一句話記帳" — the text/voice/receipt-scan pill plus its two draft-editing
// sheets. Used inline on the home page by quick-add-section.tsx
// (`initialShowText`/`initialShowScan` seed from the home page's own
// app-shortcut query param) and also opened from the global quick-add FAB
// on any other page (no initial-open; `onDone` lets the FAB dismiss its own
// wrapping sheet once an entry is saved. Cancelling only closes this flow's
// own sheet, back to the FAB sheet's category grid underneath).
export function PersonalAiQuickAddFlow({
  categories,
  accounts,
  defaultAccountId,
  defaultDate,
  frequentSplitNames,
  initialShowText = false,
  initialShowScan = false,
  listenForTry = false,
  onDone,
}: {
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  defaultAccountId: string;
  defaultDate?: string;
  frequentSplitNames: string[];
  initialShowText?: boolean;
  initialShowScan?: boolean;
  // Home page only: lets the first-record prompt's example chips open the
  // quick-add sheet pre-filled (see FirstRecordPrompt).
  listenForTry?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [showText, setShowText] = useState(initialShowText);
  const [showReceiptScan, setShowReceiptScan] = useState(initialShowScan);
  const [quickText, setQuickText] = useState("");

  useEffect(() => {
    if (!listenForTry) return;
    function onTry(e: Event) {
      const text = (e as CustomEvent<string>).detail;
      if (!text) return;
      setQuickText(text);
      setShowText(true);
    }
    window.addEventListener(QUICK_ADD_TRY_EVENT, onTry);
    return () => window.removeEventListener(QUICK_ADD_TRY_EVENT, onTry);
  }, [listenForTry]);

  return (
    <>
      <QuickAddBar
        onSubmit={(text) => {
          setQuickText(text);
          setShowText(true);
        }}
        onScanReceipt={() => setShowReceiptScan(true)}
        listenForVoiceTry={listenForTry}
      />

      <BottomSheet open={showText} onOpenChange={setShowText}>
        <BottomSheetContent>
          <BottomSheetTitle className="sr-only">一句話快速記帳</BottomSheetTitle>
          <TextQuickAdd
            categories={categories}
            accounts={accounts}
            defaultAccountId={defaultAccountId}
            defaultDate={defaultDate}
            frequentSplitNames={frequentSplitNames}
            initialText={quickText}
            onDone={() => {
              setShowText(false);
              setQuickText("");
              router.refresh();
              onDone?.();
            }}
            onCancel={() => {
              setShowText(false);
              setQuickText("");
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
            frequentSplitNames={frequentSplitNames}
            onDone={() => {
              setShowReceiptScan(false);
              router.refresh();
              onDone?.();
            }}
            onCancel={() => {
              setShowReceiptScan(false);
            }}
          />
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
