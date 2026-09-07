"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, Pencil } from "lucide-react";
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
import { CSS } from "@dnd-kit/utilities";
import { archiveAccount, reorderAccounts } from "@/app/(app)/accounts/actions";
import { isFail } from "@/lib/action-result";
import { accountTypeLabels, type AccountType } from "@/lib/account-type";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";
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

function SortableAccountCard({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: a.id,
  });
  // Scale merges into the same transform as the drag translate (has to stay
  // in the one property so the card still tracks the finger 1:1, no lag)
  // — the "pop" feel instead comes from the shadow/opacity, which animate
  // smoothly via `transition-shadow` since they're separate properties.
  const dragTransform = transform
    ? `${CSS.Transform.toString(transform)} ${isDragging ? "scale(1.05)" : ""}`.trim()
    : isDragging
      ? "scale(1.05)"
      : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: dragTransform, transition }}
      className={cn(
        "select-none transition-shadow duration-150",
        isDragging && "z-10 opacity-90 shadow-xl",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-1 items-center gap-1">
          {/* Dedicated drag handle instead of the whole card — dnd-kit needs
              touch-action: none to reliably capture the drag gesture on
              touch, but scoping that to just this small handle (rather than
              the whole card, which used to carry {...listeners} too) means
              the rest of the card keeps fully native scrolling. */}
          <button
            type="button"
            aria-label="拖曳排序"
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab text-muted-foreground/50 active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <CardTitle
            className="flex flex-1 cursor-pointer items-center gap-2 text-base"
            onClick={() => !isDragging && onOpen()}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AccountTypeIcon type={a.type} />
            </span>
            <span>{a.name}</span>
            <span className="text-muted-foreground text-xs font-normal">
              {accountTypeLabels[a.type]}
            </span>
            {a.excludeFromNetWorth && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                不記入資產
              </span>
            )}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="編輯帳戶"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={archiving}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
          >
            {archiving ? "封存中…" : "封存"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-2xl font-semibold tabular-nums">
        {a.currency !== "TWD" && (
          <span className="mr-1 text-sm font-normal text-muted-foreground">{a.currency}</span>
        )}
        {Number(a.currentBalance).toLocaleString("zh-TW")}
      </CardContent>
    </Card>
  );
}

export function AccountsList({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [items, setItems] = useState(accounts);
  const [prevAccounts, setPrevAccounts] = useState(accounts);
  const [selected, setSelected] = useState<Account | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // A small distance threshold (not a long-press delay) — now that dragging
  // only starts from the dedicated grip handle above (not the whole card),
  // there's no more conflict with scrolling to guard against, so it can
  // react immediately instead of making the user hold still first.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (accounts !== prevAccounts) {
    setPrevAccounts(accounts);
    setItems(accounts);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

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
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-4">
            {items.map((a) => (
              <SortableAccountCard
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
      </DndContext>

      <EditAccountDialog account={selected} onClose={() => setSelected(null)} />
    </>
  );
}
