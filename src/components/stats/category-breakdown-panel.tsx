import { DonutChart } from "@/components/stats/donut-chart";
import { CategoryBreakdown } from "@/components/stats/category-breakdown";
import { CategoryDrilldownList } from "@/components/stats/category-drilldown-list";

type Row = { categoryId?: string | null; name: string; icon: string | null; amount: number; color: string };
type Drilldown = { merchant: string; amount: number };

export function CategoryBreakdownPanel({
  rows,
  drilldowns,
}: {
  rows: Row[];
  // Only expense-category breakdowns have a merchant drill-down; payment
  // method breakdowns pass nothing and keep the plain flat list.
  drilldowns?: Record<string, Drilldown[]>;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">這個範圍還沒有支出紀錄。</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
      <DonutChart data={rows.map((r) => ({ name: r.name, color: r.color, amount: r.amount }))} />
      {drilldowns ? (
        <CategoryDrilldownList
          rows={rows.map((r) => ({ key: r.categoryId ?? "uncategorized", name: r.name, icon: r.icon, amount: r.amount, color: r.color }))}
          drilldowns={drilldowns}
        />
      ) : (
        <CategoryBreakdown rows={rows} />
      )}
    </div>
  );
}
