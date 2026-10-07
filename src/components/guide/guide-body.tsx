import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CalendarDays,
  ChartNoAxesColumn,
  CircleHelp,
  DatabaseBackup,
  GripVertical,
  Hand,
  HeartHandshake,
  LineChart,
  PiggyBank,
  Pointer,
  RefreshCw,
  Tags,
  UserCog,
  Wallet,
} from "lucide-react";
import { GuideSection } from "@/components/guide/guide-section";

const iconProps = { className: "size-4.5", strokeWidth: 1.75 } as const;

const faqs: { q: string; a: string }[] = [
  { q: "試用結束後會怎樣？", a: "資料都會保留，基本記帳功能繼續免費使用。" },
  { q: "換手機資料還在嗎？", a: "在，登入同一個帳號就會自動回來。" },
  {
    q: "一句話記帳是怎麼運作的？",
    a: "用 AI 讀懂你打的字、說的話或收據照片，幫你填好金額和分類。送出前都可以修改。",
  },
  { q: "一句話記帳的次數用完了？", a: "每月月初重置，一般記帳不受影響。" },
  { q: "換手機後怎麼找回解鎖？", a: "到「升級」點「恢復購買」。" },
];

const gestures: { Icon: typeof Hand; gesture: string; what: string }[] = [
  { Icon: Pointer, gesture: "點一下", what: "編輯交易" },
  { Icon: ArrowLeft, gesture: "往左滑", what: "複製、刪除交易；編輯、封存帳戶" },
  { Icon: Hand, gesture: "長按", what: "快速換分類" },
  { Icon: GripVertical, gesture: "長按拖曳", what: "調整分類、帳戶順序" },
  { Icon: CalendarDays, gesture: "點日期", what: "看當天明細、補記帳" },
];

// The whole /guide body, shared by the real page and the design preview.
// Every section links back to its feature ("前往…") and has an `id` so other
// pages can deep-link straight into it (/guide#budgets).
export function GuideBody() {
  return (
    <div className="flex flex-col gap-3">
      <GuideSection id="faq" icon={<CircleHelp {...iconProps} />} title="常見問題" summary="試用、換手機、恢復購買" defaultOpen>
        <dl className="flex flex-col gap-2.5">
          {faqs.map(({ q, a }) => (
            <div key={q} className="flex flex-col">
              <dt className="font-medium">{q}</dt>
              <dd className="text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </GuideSection>

      <GuideSection id="gestures" icon={<Hand {...iconProps} />} title="手勢操作" summary="滑、長按、拖曳">
        <ul className="!list-none !pl-0 !gap-0 divide-y">
          {gestures.map(({ Icon, gesture, what }) => (
            <li key={gesture} className="flex items-center gap-3 py-2">
              <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="w-16 shrink-0 font-medium">{gesture}</span>
              <span className="text-muted-foreground">{what}</span>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="quick-start" icon={<BookOpen {...iconProps} />} title="記帳" summary="三種記帳方式" bear="record">
        <ul>
          <li><strong>一句話</strong>：打「午餐 120」或用說的，自動填好金額和分類。</li>
          <li><strong>拍收據</strong>：點相機拍照，自動讀出金額和店家。</li>
          <li><strong>一般記帳</strong>：選分類、輸入金額。</li>
        </ul>
        <p className="text-muted-foreground">送出前都可以修改。其他頁面點右下角「＋」也能記帳。</p>
      </GuideSection>

      <GuideSection id="accounts" icon={<Wallet {...iconProps} />} title="帳戶" summary="多帳戶、轉帳、淨資產" bear="multi-account" href="/accounts">
        <ul>
          <li>現金、銀行、信用卡分開記，自動算出淨資產。</li>
          <li>帳戶互轉用「轉帳」，不算支出。</li>
          <li>定存可設「不計入淨值」。</li>
        </ul>
      </GuideSection>

      <GuideSection id="categories" icon={<Tags {...iconProps} />} title="分類" summary="自訂、排序" bear="categorize" href="/categories">
        <p>可以新增、改名、換圖示和顏色。常用的拖到前面，記帳更快。</p>
      </GuideSection>

      <GuideSection id="split" icon={<HeartHandshake {...iconProps} />} title="分帳" summary="和朋友分攤、結清" bear="split" href="/shared">
        <ul>
          <li><strong>我先付</strong>：全額從你的帳戶扣，對方欠你。</li>
          <li><strong>對方先付</strong>：結清時才記成支出。</li>
        </ul>
        <p className="text-muted-foreground">可以依帳單或依對象查看，一次結清。</p>
      </GuideSection>

      <GuideSection id="budgets" icon={<ChartNoAxesColumn {...iconProps} />} title="預算" summary="每月花費上限" bear="budget-planning" href="/budgets">
        <p>幫分類設定每月上限，進度條會顯示花得快還是慢。</p>
      </GuideSection>

      <GuideSection id="goals" icon={<PiggyBank {...iconProps} />} title="儲蓄目標" summary="為想要的東西存錢" bear="saving" href="/goals">
        <p>設定目標金額，每次存錢記一筆，看著進度往上爬。</p>
      </GuideSection>

      <GuideSection id="subscriptions" icon={<RefreshCw {...iconProps} />} title="訂閱／定期收支" summary="房租、訂閱、薪水" bear="subscription" href="/subscriptions">
        <p>設定週期後，到期時首頁會提醒，點一下就記好。</p>
      </GuideSection>

      <GuideSection id="calendar" icon={<Calendar {...iconProps} />} title="行事曆" summary="每天花多少" bear="calendar" href="/calendar">
        <p>顏色越深花越多。點日期可以看明細、補記帳。</p>
      </GuideSection>

      <GuideSection id="stats" icon={<LineChart {...iconProps} />} title="統計" summary="錢花去哪了" bear="reports" href="/stats">
        <p>看每月收支、分類占比、長期趨勢，點分類可以看到店家。</p>
      </GuideSection>

      <GuideSection id="data" icon={<DatabaseBackup {...iconProps} />} title="資料與備份" summary="匯出、還原" bear="cloud-backup" href="/data-export">
        <ul>
          <li>匯出 CSV、Excel 或月報表。</li>
          <li>每天自動備份，誤刪可以還原。</li>
        </ul>
      </GuideSection>

      <GuideSection id="account" icon={<UserCog {...iconProps} />} title="帳號與升級" summary="一次買斷，不用訂閱" bear="secure-login" href="/upgrade" hrefLabel="查看升級方案">
        <p>新帳號有 7 天全功能試用。升級一次買斷，解鎖多帳戶、進階統計、匯出和分帳。</p>
      </GuideSection>
    </div>
  );
}
