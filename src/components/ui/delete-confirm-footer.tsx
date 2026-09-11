"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

// Shared footer shape for every "編輯 + 刪除" dialog in the app — horizontal
// even on mobile (DialogFooter's own default stacks full-width buttons in a
// column below the sm: breakpoint, which is every phone; users reported the
// stacked layout made it easy to land a thumb on 刪除 while reaching for
// 儲存) and gated behind an explicit second tap instead of deleting on the
// first one. `confirming` is controlled by the caller so it can be reset
// from the same render-phase "did the edited item change" block every one
// of these dialogs already has for its other fields.
export function DeleteConfirmFooter({
  confirming,
  onConfirmingChange,
  confirmMessage,
  deleteLabel = "刪除",
  deletingLabel = "處理中…",
  onDelete,
  pending,
  children,
}: {
  confirming: boolean;
  onConfirmingChange: (next: boolean) => void;
  confirmMessage: string;
  deleteLabel?: string;
  deletingLabel?: string;
  onDelete: () => void;
  pending: boolean;
  // The dialog's own secondary actions (儲存, or 取消+儲存) for the normal
  // (not-yet-confirming) state — this component only owns the delete side.
  children: React.ReactNode;
}) {
  if (confirming) {
    return (
      <DialogFooter className="flex-row items-center justify-between gap-2">
        <span className="text-sm text-destructive">{confirmMessage}</span>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => onConfirmingChange(false)}>
            取消
          </Button>
          <Button variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
            {pending ? deletingLabel : "確定"}
          </Button>
        </div>
      </DialogFooter>
    );
  }

  return (
    <DialogFooter className="flex-row justify-between">
      <Button variant="destructive" disabled={pending} onClick={() => onConfirmingChange(true)}>
        {deleteLabel}
      </Button>
      <div className="flex gap-2">{children}</div>
    </DialogFooter>
  );
}
