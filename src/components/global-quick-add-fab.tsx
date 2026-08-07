"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Handshake, Lock, Plus, Sparkles, SquarePen, X } from "lucide-react";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { QuickAddCategoryFlow } from "@/components/record/quick-add-category-flow";
import { PersonalAiQuickAddFlow } from "@/components/record/personal-ai-quick-add-flow";
import { AddSharedExpenseDialog } from "@/components/shared/add-expense-dialog";
import { cn } from "@/lib/utils";
import type { QuickAddAccount, QuickAddCategory } from "@/lib/quick-add-context";

type Mode = "general" | "ai" | "shared";

const choices: { mode: Mode; label: string; desc: string; Icon: typeof SquarePen }[] = [
  { mode: "general", label: "一般記帳", desc: "分類格 → 金額輸入", Icon: SquarePen },
  { mode: "ai", label: "AI 記帳", desc: "打字或語音一句話", Icon: Sparkles },
  { mode: "shared", label: "分帳記帳", desc: "跟另一半平分的支出", Icon: Handshake },
];

// Renders on every page except the home page (mounted alongside MainNav in
// the (app) layout) so a transaction can be logged from anywhere without
// navigating to the home page first. Hidden on /record specifically
// because that page already shows the category grid and the AI text/voice
// bar inline — showing "+" there just pops up the exact same flow again
// on top of itself, which read as a duplicate rather than a shortcut.
// Tapping "+" never navigates — it opens a chooser sheet, then the picked
// flow opens in its own sheet on top of whatever page is currently
// showing, and closing it returns you right where you were.
export function GlobalQuickAddFab({
  categories,
  accounts,
  partnerName,
  sharedLocked,
}: {
  categories: QuickAddCategory[];
  accounts: QuickAddAccount[];
  partnerName: string;
  sharedLocked: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);

  // Context defaults derived straight from the URL, not lifted state — the
  // FAB is mounted once in (app)/layout.tsx, a sibling of every page rather
  // than a descendant of any single one, so the URL is the only thing both
  // sides already agree on without wiring up a new shared context.
  const defaultDate = useMemo(() => {
    if (pathname !== "/calendar") return undefined;
    return searchParams.get("day") ?? undefined;
  }, [pathname, searchParams]);

  const contextAccountId = useMemo(() => {
    const match = /^\/accounts\/([^/]+)$/.exec(pathname);
    if (!match) return undefined;
    const id = match[1];
    // Only trust it if it's actually one of the accounts quick-add already
    // knows about — an archived or "exclude from net worth" account has its
    // own /accounts/[id] page but is deliberately left out of this list (see
    // getQuickAddContext), so falling through to the normal default (first
    // account) is correct rather than forcing an invalid selection.
    return accounts.some((a) => a.id === id) ? id : undefined;
  }, [pathname, accounts]);

  if (pathname.startsWith("/record")) return null;

  function pick(next: Mode) {
    if (next === "shared" && sharedLocked) {
      setChooserOpen(false);
      router.push("/upgrade?from=shared");
      return;
    }
    setChooserOpen(false);
    setMode(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setChooserOpen(true)}
        aria-label="快速記帳"
        className="fixed right-4 z-40 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="size-5" strokeWidth={2.5} />
      </button>

      <BottomSheet open={chooserOpen} onOpenChange={setChooserOpen}>
        <BottomSheetContent>
          <div className="flex items-center justify-between">
            <BottomSheetTitle className="text-sm font-semibold text-muted-foreground">
              要用哪種方式記帳？
            </BottomSheetTitle>
            <button
              type="button"
              onClick={() => setChooserOpen(false)}
              aria-label="關閉"
              className="text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          {choices.map(({ mode: choiceMode, label, desc, Icon }) => {
            const locked = choiceMode === "shared" && sharedLocked;
            return (
              <button
                key={choiceMode}
                type="button"
                onClick={() => pick(choiceMode)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-left transition-colors hover:bg-muted",
                )}
              >
                <Icon className="size-5 text-primary" strokeWidth={1.75} />
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </span>
                {locked && <Lock className="size-4 text-muted-foreground" strokeWidth={2} />}
              </button>
            );
          })}
          <p className="pb-2 text-center text-xs text-muted-foreground">
            在任何分頁按「+」都會直接彈出這個選單。
          </p>
        </BottomSheetContent>
      </BottomSheet>

      <BottomSheet open={mode === "general"} onOpenChange={(open) => !open && setMode(null)}>
        <BottomSheetContent>
          <BottomSheetTitle className="sr-only">一般記帳</BottomSheetTitle>
          <QuickAddCategoryFlow
            categories={categories}
            accounts={accounts}
            partnerName={partnerName}
            defaultAccountId={contextAccountId}
            defaultDate={defaultDate}
            onDone={() => setMode(null)}
          />
        </BottomSheetContent>
      </BottomSheet>

      <BottomSheet open={mode === "ai"} onOpenChange={(open) => !open && setMode(null)}>
        <BottomSheetContent>
          <BottomSheetTitle className="sr-only">AI 記帳</BottomSheetTitle>
          <PersonalAiQuickAddFlow
            categories={categories}
            accounts={accounts}
            defaultAccountId={contextAccountId ?? accounts[0]?.id ?? ""}
            defaultDate={defaultDate}
            partnerName={partnerName}
            onClose={() => setMode(null)}
          />
        </BottomSheetContent>
      </BottomSheet>

      <AddSharedExpenseDialog
        categories={categories.filter((c) => c.type === "expense")}
        partnerName={partnerName}
        defaultDate={defaultDate}
        open={mode === "shared"}
        onOpenChange={(open) => !open && setMode(null)}
      />
    </>
  );
}
