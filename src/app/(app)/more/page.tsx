import Link from "next/link";
import { requireUserId } from "@/lib/auth";

const links = [
  { href: "/categories", icon: "🏷️", label: "分類管理", desc: "新增自己的記帳分類" },
  { href: "/budgets", icon: "📊", label: "預算", desc: "設定每月分類花費上限" },
  { href: "/goals", icon: "🐷", label: "儲蓄目標", desc: "為想要的東西存錢" },
  { href: "/subscriptions", icon: "🔁", label: "訂閱 / 定期收支", desc: "管理訂閱與現金流預測" },
  { href: "/transactions", icon: "📋", label: "所有交易", desc: "完整交易紀錄列表" },
];

export default async function MorePage() {
  await requireUserId();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">更多</h1>
      <div className="flex flex-col gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="text-2xl">{l.icon}</span>
            <div className="flex flex-col">
              <span className="font-medium">{l.label}</span>
              <span className="text-xs text-muted-foreground">{l.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
