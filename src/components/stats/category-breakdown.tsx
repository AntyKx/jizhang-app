import { CategoryIcon } from "@/components/category-icon";

type Row = { name: string; icon: string | null; amount: number; color: string };

export function CategoryBreakdown({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">這個月還沒有支出紀錄。</p>;
  }

  const max = Math.max(...rows.map((r) => r.amount));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.name} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <CategoryIcon icon={r.icon} className="h-4 w-4" />
              <span>{r.name}</span>
            </span>
            <span className="text-muted-foreground tabular-nums">
              {Math.round(r.amount).toLocaleString("zh-TW")}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(4, (r.amount / max) * 100)}%`,
                backgroundColor: r.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
