import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { CategorySortableGrid } from "@/components/categories/category-sortable-grid";
import { CategoriesDoneButton } from "@/components/categories/categories-done-button";
import { OneTimeHint } from "@/components/onboarding/gesture-hint";
import { Hand } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";

export default async function CategoriesPage() {
  const userId = await requireUserId();

  const userCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
      type: categories.type,
      isFixed: categories.isFixed,
    })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.sortOrder);

  const expenseCategories = userCategories.filter((c) => c.type === "expense");
  const incomeCategories = userCategories.filter((c) => c.type === "income");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="分類管理"
        actions={
          <>
            <CreateCategoryDialog />
            <CategoriesDoneButton />
          </>
        }
      />
      <OneTimeHint id="category-drag" icon={<Hand className="size-4" />} className="mt-0">
        點圖示編輯，長按拖曳調整順序
      </OneTimeHint>

      <div className="flex flex-col gap-3">
        <SectionTitle>支出分類</SectionTitle>
        <CategorySortableGrid categories={expenseCategories} />
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>收入分類</SectionTitle>
        <CategorySortableGrid categories={incomeCategories} />
      </div>
    </div>
  );
}
