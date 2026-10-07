import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { CategorySortableGrid } from "@/components/categories/category-sortable-grid";
import { CategoriesDoneButton } from "@/components/categories/categories-done-button";
import { OneTimeHint } from "@/components/onboarding/gesture-hint";
import { Hand } from "lucide-react";

export default async function CategoriesPage() {
  const userId = await requireUserId();

  const userCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
      type: categories.type,
    })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.sortOrder);

  const expenseCategories = userCategories.filter((c) => c.type === "expense");
  const incomeCategories = userCategories.filter((c) => c.type === "income");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">分類管理</h1>
        <div className="flex items-center gap-2">
          <CreateCategoryDialog />
          <CategoriesDoneButton />
        </div>
      </div>
      <OneTimeHint id="category-drag" icon={<Hand className="size-4" />} className="mt-0">
        點圖示編輯，長按拖曳調整順序
      </OneTimeHint>

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
