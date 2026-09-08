"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, GripVertical, Pencil } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { archiveAccount, reorderAccounts } from "@/app/(app)/accounts/actions";
import { isFail } from "@/lib/action-result";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { Button } from "@/components/ui/button";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";
import { SwipeToDelete } from "@/components/transactions/swipe-to-delete";
import { cn } from "@/lib/utils";

type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: string;
  excludeFromNetWorth: boolean;
  initialBalance: string;
};

// Display order for the grouped sections — liquid cash first, then debt
// (credit cards), then where money actually sits (bank), then wallets/
// investments. Not the same order accountTypeLabels happens to declare its
// keys in.
const TYPE_ORDER: AccountType[] = ["cash", "credit_card", "bank", "e_wallet", "investment"];

function SortableAccountRow({
  account: a,
  archiving,
  onOpen,
  onEdit,
  onArchive,
}: {
  account: Account;
  archiving: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  // `data: { type }` is what lets handleDragEnd below refuse a drop onto a
  // different type's group — see the comment there.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: a.id,
    data: { type: a.type },
  });
  const balance = Number(a.currentBalance);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
      className={cn(isDragging && "z-10 opacity-90")}
    >
      <SwipeToDelete
        disabled={archiving}
        onTap={() => !isDragging && onOpen()}
        actions={[
          {
            label: archiving ? "封存中" : "封存",
            icon: <Archive className="size-4" />,
            onClick: onArchive,
            className: "bg-muted text-muted-foreground",
          },
        ]}
      >
        <div className="flex items-center gap-2.5 px-1 py-2.5">
          {/* Dedicated drag handle, not the whole row — dnd-kit needs
              touch-action: none to reliably capture the drag gesture on
              touch, but scoping that to just this small handle (instead of
              the whole row) leaves the row's own swipe-to-archive gesture
              and native scrolling alone. stopPropagation here (then
              forwarding to dnd-kit's own onPointerDown) keeps this pointer-
              down from also being read by SwipeToDelete's row-level
              gesture handling as the start of a swipe. */}
          <button
            type="button"
            aria-label="拖曳排序"
            {...attributes}
            {...listeners}
            onPointerDown={(e) => {
              e.stopPropagation();
              listeners?.onPointerDown?.(e);
            }}
            onPointerUp={(e) => e.stopPropagation()}
            className="touch-none shrink-0 cursor-grab text-muted-foreground/40 active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[30%] bg-primary/12 text-primary">
            <AccountTypeIcon type={a.type} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{a.name}</span>
            {a.excludeFromNetWorth && (
              <span className="text-xs text-muted-foreground">不記入資產</span>
            )}
          </span>
          <span
            className={cn("shrink-0 text-sm font-semibold tabular-nums", balance < 0 && "text-destructive")}
          >
            {a.currency !== "TWD" && (
              <span className="mr-1 text-xs font-normal text-muted-foreground">{a.currency}</span>
            )}
            {balance.toLocaleString("zh-TW")}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="編輯帳戶"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="size-4" />
          </Button>
        </div>
      </SwipeToDelete>
    </div>
  );
}

export function AccountsList({
  accounts,
  groupSubtotals,
}: {
  accounts: Account[];
  // Precomputed server-side (TWD-converted, same exchange rates as the net
  // worth summary above this list) rather than threaded down as raw rates —
  // reordering within a group doesn't change any balance, so these don't
  // need to be reactive to the client-side drag state below.
  groupSubtotals: Partial<Record<AccountType, number>>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(accounts);
  const [prevAccounts, setPrevAccounts] = useState(accounts);
  const [selected, setSelected] = useState<Account | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // A small distance threshold (not a long-press delay) — dragging only
  // starts from the dedicated grip handle above, so there's no conflict
  // with scrolling/swiping to guard against.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (accounts !== prevAccounts) {
    setPrevAccounts(accounts);
    setItems(accounts);
  }

  const groups = TYPE_ORDER.map((type) => ({
    type,
    accounts: items.filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Groups render as separate SortableContexts below, so a drop landing
    // on a different type shouldn't normally be reachable — this is the
    // hard guarantee that it's a no-op even so, rather than relying only
    // on the rendering/collision layout to keep drags scoped to one group.
    const activeType = active.data.current?.type as AccountType | undefined;
    const overType = over.data.current?.type as AccountType | undefined;
    if (!activeType || activeType !== overType) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    // Reindex sequentially across the *whole* reassembled list (not just
    // the dragged group in isolation) so sortOrder stays a single
    // consistent global order — anything that lists accounts flat
    // elsewhere (the account picker in quick-add, the transfer dialog)
    // still gets a sensible grouped-by-type order out of it, even without
    // its own type-grouped UI.
    startTransition(async () => {
      await reorderAccounts(reordered.map((item, index) => ({ id: item.id, sortOrder: index })));
    });
  }

  function handleArchive(id: string) {
    setArchivingId(id);
    startTransition(async () => {
      const result = await archiveAccount(id);
      if (isFail(result)) {
        toast.error(result.error);
      } else {
        toast.success("已封存帳戶");
      }
      setArchivingId(null);
    });
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col">
          {groups.map(({ type, accounts: groupAccounts }) => (
            <div key={type} className="flex flex-col">
              <div className="flex items-baseline justify-between px-1 pt-4 pb-1.5 first:pt-0">
                <span className="text-xs font-semibold text-muted-foreground">
                  {accountTypeLabels[type]}
                </span>
                {groupSubtotals[type] != null && (
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      groupSubtotals[type]! < 0 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {Math.round(groupSubtotals[type]!).toLocaleString("zh-TW")}
                  </span>
                )}
              </div>
              <SortableContext items={groupAccounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col divide-y">
                  {groupAccounts.map((a) => (
                    <SortableAccountRow
                      key={a.id}
                      account={a}
                      archiving={archivingId === a.id}
                      onOpen={() => router.push(`/accounts/${a.id}`)}
                      onEdit={() => setSelected(a)}
                      onArchive={() => handleArchive(a.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>

      <EditAccountDialog account={selected} onClose={() => setSelected(null)} />
    </>
  );
}
