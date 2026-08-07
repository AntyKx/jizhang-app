import Link from "next/link";
import { ChartNoAxesColumn, DatabaseBackup, FileText, HeartHandshake, Lock, PiggyBank, ReceiptText, RefreshCw, ShieldCheck, Sparkles, Tags, UserCog, Wrench } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { hasCoreAccess, isDevAdmin } from "@/lib/entitlements";
import { BearIllustration } from "@/components/bear-illustration";

const links = [
  { href: "/account", Icon: UserCog, label: "帳號設定", desc: "大頭貼、姓名、Email、登出" },
  { href: "/shared", Icon: HeartHandshake, label: "分帳", desc: "跟另一半平分的支出、結算紀錄", lockable: true },
  { href: "/categories", Icon: Tags, label: "分類管理", desc: "新增自己的記帳分類" },
  { href: "/budgets", Icon: ChartNoAxesColumn, label: "預算", desc: "設定每月分類花費上限" },
  { href: "/goals", Icon: PiggyBank, label: "儲蓄目標", desc: "為想要的東西存錢" },
  { href: "/subscriptions", Icon: RefreshCw, label: "訂閱 / 定期收支", desc: "管理訂閱與現金流預測" },
  { href: "/transactions", Icon: ReceiptText, label: "所有交易", desc: "完整交易紀錄列表" },
  { href: "/data-export", Icon: DatabaseBackup, label: "資料與備份", desc: "匯出 CSV／Excel、備份與還原、刪除資料" },
  { href: "/upgrade", Icon: Sparkles, label: "升級", desc: "解鎖核心功能、訂閱 AI 記帳" },
  { href: "/terms", Icon: FileText, label: "服務條款", desc: "使用本服務前應閱讀的條款" },
  { href: "/privacy", Icon: ShieldCheck, label: "隱私權政策", desc: "個人資料蒐集與使用方式" },
];

export default async function MorePage() {
  const userId = await requireUserId();
  const showDevTools = isDevAdmin(userId);
  const unlocked = await hasCoreAccess(userId);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <BearIllustration name="account-management" size={120} />
        <h1 className="text-2xl font-semibold">更多</h1>
      </div>
      <div className="flex flex-col gap-3">
        {links.map(({ href, Icon, label, desc, lockable }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <div className="flex flex-1 flex-col">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
            {lockable && !unlocked && <Lock className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />}
          </Link>
        ))}
        {showDevTools && (
          <Link
            href="/dev-tools"
            className="flex items-center gap-3 rounded-2xl border border-dashed p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Wrench className="size-5" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col">
              <span className="font-medium">開發者工具</span>
              <span className="text-xs text-muted-foreground">測試解鎖／訂閱狀態</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
