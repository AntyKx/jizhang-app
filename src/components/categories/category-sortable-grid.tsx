"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { deleteCategory, reorderCategories } from "@/app/(app)/categories/actions";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; userId: string | null };

function SortableTile({
  category,
  confirmingDelete,
  onTap,
  onDeleteTap,
}: {
  category: Category;
  confirmingDelete: boolean;
  onTap: () => void;
  onDeleteTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  // System default categories (userId === null) are shared across every
  // user — editing/deleting them here is blocked server-side too, but
  // hiding the affordance avoids a confusing silent no-op.
  const isSystemCategory = category.userId === null;
  // Scale merges into the same transform as the drag translate (has to
  // stay in the one property so the tile still tracks the finger 1:1, no
  // lag) — the "pop" feel instead comes from the shadow/opacity, which
  // animate smoothly via `transition-shadow` since they're separate
  // properties.
  const dragTransform = transform
    ? `${CSS.Transform.toString(transform)} ${isDragging ? "scale(1.08)" : ""}`.trim()
    : isDragging
      ? "scale(1.08)"
      : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: dragTransform, transition }}
      onClick={() => {
        if (isDragging) return;
        if (isSystemCategory) {
          toast.info("系統預設分類無法編輯，如需自訂請新增一個新分類");
          return;
        }
        onTap();
      }}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 select-none transition-shadow duration-150",
        isDragging && "z-10 opacity-90 shadow-xl",
      )}
    >
      {!isSystemCategory && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteTap();
          }}
          className={cn(
            "absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white transition-colors",
            confirmingDelete ? "bg-destructive" : "bg-muted-foreground/60 hover:bg-destructive",
          )}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {/* Dedicated drag handle, same reasoning as accounts-list.tsx's
          SortableAccountCard — dnd-kit needs touch-action: none to reliably
          capture the drag gesture on touch, but scoping that to just this
          small corner handle (rather than the whole tile) keeps the rest of
          the grid natively scrollable. */}
      <button
        type="button"
        aria-label="拖曳排序"
        {...attributes}
        {...listeners}
        className="absolute -top-1.5 -left-1.5 flex h-5 w-5 touch-none cursor-grab items-center justify-center rounded-full bg-muted-foreground/60 text-white active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <CategoryIcon icon={category.icon} className="h-7 w-7 text-2xl" />
      <span className="text-xs text-muted-foreground">
        {confirmingDelete ? "再點一次刪除" : category.name}
      </span>
    </div>
  );
}

export function CategorySortableGrid({ categories }: { categories: Category[] }) {
  const [items, setItems] = useState(categories);
  const [prevCategories, setPrevCategories] = useState(categories);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // A small distance threshold (not a long-press delay) — dragging only
  // starts from each tile's dedicated grip handle (not the whole tile), so
  // there's no more conflict with scrolling to guard against.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (categories !== prevCategories) {
    setPrevCategories(categories);
    setItems(categories);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    startTransition(async () => {
      await reorderCategories(reordered.map((item, index) => ({ id: item.id, sortOrder: index })));
    });
  }

  function handleDeleteTap(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteCategory(id);
      toast.success("已刪除分類");
    });
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-3">
            {items.map((c) => (
              <SortableTile
                key={c.id}
                category={c}
                confirmingDelete={confirmDeleteId === c.id}
                onTap={() => setEditing(c)}
                onDeleteTap={() => handleDeleteTap(c.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <EditCategoryDialog category={editing} onClose={() => setEditing(null)} />
    </>
  );
}
