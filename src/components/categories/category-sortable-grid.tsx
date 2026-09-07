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
import { X } from "lucide-react";
import { CategoryIconBadge } from "@/components/category-icon";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { deleteCategory, reorderCategories } from "@/app/(app)/categories/actions";
import { isFail } from "@/lib/action-result";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null };

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
        if (!isDragging) onTap();
      }}
      // No dedicated grab handle — the whole tile is the drag surface, iOS
      // home-screen style: a quick tap opens edit, a long press (see the
      // sensor's activationConstraint below) starts a drag. touch-action:
      // none is what lets dnd-kit's delay timer win the gesture instead of
      // the browser starting its own scroll on touch-down.
      {...attributes}
      {...listeners}
      className={cn(
        "relative flex touch-none flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 select-none transition-shadow duration-150",
        isDragging && "z-10 opacity-90 shadow-xl",
      )}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDeleteTap();
        }}
        className={cn(
          "absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors",
          confirmingDelete ? "bg-destructive" : "bg-muted-foreground/60 hover:bg-destructive",
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <CategoryIconBadge
        icon={category.icon}
        color={category.color}
        className="h-11 w-11"
        iconClassName="h-5 w-5"
      />
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
  // iOS-style long press instead of a dedicated handle: the same 500ms as
  // this app's other long-press affordance (SwipeToDelete's onLongPress).
  // `tolerance` cancels the drag-start if the finger moves more than 8px
  // before the delay elapses, so a normal scroll swipe starting on a tile
  // still falls through as a scroll instead of misfiring a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 8 } }));

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
      const result = await deleteCategory(id);
      if (isFail(result)) {
        toast.error(result.error);
        // Removed optimistically above — put it back since the delete
        // didn't actually happen.
        setItems((prev) => (prev.some((i) => i.id === id) ? prev : [...prev, ...categories.filter((c) => c.id === id)]));
        return;
      }
      toast.success("已刪除分類");
    });
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-4">
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
