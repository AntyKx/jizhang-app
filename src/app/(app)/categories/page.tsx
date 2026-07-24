import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { CategorySortableGrid } from "@/components/categories/category-sortable-grid";

export default async function CategoriesPage() {
  const userId = await requireUserId();

  const userCategories = await db
    .select({ id: categories.id, name: categories.name, icon: categories.icon, type: categories.type })
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)))
    .orderBy(categories.sortOrder);

  const expenseCategories = userCategories.filter((c) => c.type === "expense");
  const incomeCategories = userCategories.filter((c) => c.type === "income");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">分類管理</h1>
        <CreateCategoryDialog />
      </div>
      <p className="text-xs text-muted-foreground">點圖示可編輯、點右上角 ✕ 可刪除、按住拖曳可排序</p>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">支出分類</h2>
        <CategorySortableGrid categories={expenseCategories} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">收入分類</h2>
        <CategorySortableGrid categories={incomeCategories} />
      </div>
    </div>
  );
}
