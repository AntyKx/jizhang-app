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
import { CategoryIcon } from "@/components/category-icon";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { deleteCategory, reorderCategories } from "@/app/(app)/categories/actions";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null };

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

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onTap()}
      className={cn(
        "relative flex touch-none flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 select-none",
        isDragging && "z-10 opacity-70 shadow-lg",
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
          "absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white transition-colors",
          confirmingDelete ? "bg-destructive" : "bg-muted-foreground/60 hover:bg-destructive",
        )}
      >
        <X className="h-3 w-3" />
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

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
