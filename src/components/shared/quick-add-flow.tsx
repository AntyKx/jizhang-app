"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuickAddBar } from "@/components/record/quick-add-bar";
import { SharedTextQuickAdd } from "@/components/shared/text-quick-add";

type Category = { id: string; name: string; icon: string | null };

export function SharedQuickAddFlow({
  categories,
  partnerName,
  onDone,
}: {
  categories: Category[];
  partnerName: string;
  // Only needed when this is opened from the global quick-add FAB (wrapped
  // in its own sheet there) so it can dismiss that wrapper too — the plain
  // in-page usage on the 分帳 dashboard doesn't pass it.
  onDone?: () => void;
}) {
  const router = useRouter();
  const [showText, setShowText] = useState(false);
  const [quickText, setQuickText] = useState("");

  if (showText) {
    return (
      <SharedTextQuickAdd
        categories={categories}
        partnerName={partnerName}
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
          onDone?.();
        }}
      />
    );
  }

  return (
    <QuickAddBar
      placeholder="晚餐 1200 元，我付的"
      onSubmit={(text) => {
        setQuickText(text);
        setShowText(true);
      }}
    />
  );
}
