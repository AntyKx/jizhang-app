import {
  BookOpen,
  Calendar,
  ChartNoAxesColumn,
  DatabaseBackup,
  HeartHandshake,
  LineChart,
  PiggyBank,
  RefreshCw,
  Tags,
  UserCog,
  Wallet,
} from "lucide-react";
import { BackLink } from "@/components/back-link";
import { GuideSection } from "@/components/guide/guide-section";

export const metadata = {
  title: "使用說明 - 小熊記帳本",
};

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/more" label="更多功能" />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">使用說明</h1>
        <p className="text-sm text-muted-foreground">
          這裡整理了小熊記帳本每個功能的用法，點開你需要的部分看就好，不用整份讀完。
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <GuideSection
          icon={<BookOpen className="size-4.5" strokeWidth={1.75} />}
          title="快速上手"
          summary="怎麼記第一筆帳"
          defaultOpen
        >
          <p>首頁右下角的「＋」是記帳的入口，點開會看到兩種方式：</p>
          <ul>
            <li>
              <strong>一般記帳</strong>：先選分類，再用數字鍵盤輸入金額，也可以在這裡直接分帳（跟朋友均分或自訂金額）。
            </li>
            <li>
              <strong>AI 記帳</strong>：打一句話（例如「午餐麥當勞 185 元，刷信用卡」）或點麥克風用講的，AI
              會自動判斷金額、分類、付款方式；也能點相機圖示拍收據，AI 直接從照片讀出金額和商家。送出前都可以手動修正 AI 判斷錯的地方。
            </li>
          </ul>
          <p>首頁「今日交易」列表：點一筆可以編輯、往左滑會出現複製／刪除，長按可以快速換分類。</p>
          <img src="/guide/quick-add.png" alt="首頁記帳入口與分類格" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<Wallet className="size-4.5" strokeWidth={1.75} />}
          title="帳戶管理"
          summary="新增帳戶、轉帳、封存"
        >
          <p>底部導覽「帳戶」可以管理多個帳戶（現金、銀行、信用卡、電子錢包、投資），每個帳戶可以設定不同幣別跟起始餘額。</p>
          <ul>
            <li>列表可以拖曳排序；往左滑一筆帳戶會出現「編輯」和「封存」。</li>
            <li>封存前會再跳出一次確認，封存後帳戶會從清單和記帳選項中隱藏，但交易紀錄都會保留，之後可以在「已封存帳戶」取消封存。</li>
            <li>帳戶之間互轉（例如提款到現金）用帳戶頁上方的「轉帳」按鈕，不會跑出一筆支出或收入。</li>
            <li>固定不動用的帳戶（例如定存）可以勾選「不計入淨值」，這樣它就不會被算進總資產。</li>
          </ul>
          <img src="/guide/account-create.png" alt="新增帳戶表單" className="w-full rounded-xl border" />
          <img src="/guide/account-swipe.png" alt="帳戶列表往左滑出現編輯與封存" className="w-full rounded-xl border" />
          <img src="/guide/account-archive-confirm.png" alt="封存帳戶前的二次確認" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<Tags className="size-4.5" strokeWidth={1.75} />}
          title="分類管理"
          summary="新增、編輯、排序分類"
        >
          <p>更多 →「分類管理」可以自訂收入／支出分類。點圖示可以編輯名稱、圖示、顏色，點右上角 ✕ 可以刪除，長按拖曳可以排序。</p>
          <img src="/guide/categories.png" alt="分類管理的圖示格" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<HeartHandshake className="size-4.5" strokeWidth={1.75} />}
          title="分帳（跟別人 AA）"
          summary="我付的、對方付的、怎麼結清"
        >
          <p>記帳時選「分帳」分頁，或在分帳頁自己新增，也可以直接打一句話讓 AI 判斷（例如「咖啡 200，跟小明均分」）：</p>
          <img src="/guide/split-ai-form.png" alt="AI 判斷出的分帳項目與對象" className="w-full rounded-xl border" />
          <p>有兩種方向：</p>
          <ul>
            <li><strong>我付的</strong>：這筆錢是你先付的，對方欠你他的那份，記帳時會照全額入你的帳戶。</li>
            <li><strong>對方付的</strong>：對方先付的，你欠對方一部分，這種不會動到你任何帳戶的錢，只會出現在分帳頁，等結清時才會真的產生一筆支出。</li>
          </ul>
          <p>分帳頁有兩種檢視方式，可以在頁面上切換：</p>
          <ul>
            <li><strong>依事件</strong>：一張帳單一張卡片，看得到每個人分到多少、誰結清了誰還沒。</li>
            <li><strong>依對象</strong>：同一個人名下所有還沒結清的項目收在一起，適合固定跟同一個人（例如另一半）長期分帳，一次全部結清。</li>
          </ul>
          <p>結清可以三種方式：單筆結清、一次結清整個事件的所有人、或依對象一次全部結清（會把多筆淨額算成一筆）。結清按鈕旁邊如果有多個帳戶，可以展開選要記到哪個帳戶。</p>
          <img src="/guide/split-event-card.png" alt="依事件檢視的分帳卡片" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<ChartNoAxesColumn className="size-4.5" strokeWidth={1.75} />}
          title="預算"
          summary="每月分類花費上限"
        >
          <p>更多 →「預算」可以幫某個支出分類設定每月上限，例如「餐飲每月 8000 元」，頁面會顯示這個月已經花了多少、還剩多少。</p>
          <img src="/guide/budget-create.png" alt="新增本月預算表單" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<PiggyBank className="size-4.5" strokeWidth={1.75} />}
          title="儲蓄目標"
          summary="幫想要的東西存錢"
        >
          <p>更多 →「儲蓄目標」可以設定一個目標金額（例如出國旅遊 5 萬元），存入紀錄後會看到進度條跟還差多少。</p>
          <img src="/guide/goal-create.png" alt="新增儲蓄目標表單" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<RefreshCw className="size-4.5" strokeWidth={1.75} />}
          title="訂閱／定期收支"
          summary="自動記帳、到期提醒"
        >
          <p>更多 →「訂閱／定期收支」用來記固定會發生的收支（Netflix 月費、房租、薪水），設定週期後（每天／每週／每月／每年）系統會在到期時提醒你，不用每次手動記。</p>
          <img src="/guide/subscription-create.png" alt="新增定期收支表單" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<Calendar className="size-4.5" strokeWidth={1.75} />}
          title="行事曆"
          summary="熱力圖、單日明細"
        >
          <p>底部導覽「行事曆」用顏色深淺呈現每天的花費，顏色越深代表那天花得越多，一眼就能看出這個月哪幾天花最兇。點某一天可以看當天明細，也能直接在這裡編輯或補記帳。</p>
          <img src="/guide/calendar-heatmap.png" alt="行事曆熱力圖" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<LineChart className="size-4.5" strokeWidth={1.75} />}
          title="統計"
          summary="總覽、支出分析、趨勢、預算目標"
        >
          <p>底部導覽「統計」分成四個分頁：</p>
          <ul>
            <li><strong>總覽</strong>：這個月收支概況。</li>
            <li><strong>支出分析</strong>：錢花去哪裡，依分類、商家細看。</li>
            <li><strong>趨勢</strong>：跟過去幾個月比較，看收支變化。</li>
            <li><strong>預算目標</strong>：預算執行進度、儲蓄目標達成率。</li>
          </ul>
          <img src="/guide/stats-tabs.png" alt="統計頁四個分頁" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<DatabaseBackup className="size-4.5" strokeWidth={1.75} />}
          title="資料與備份"
          summary="匯出、雲端快照、刪除資料"
        >
          <p>更多 →「資料與備份」可以匯出 CSV、Excel 或本月月報表，也可以手動下載備份檔。</p>
          <ul>
            <li>每筆記帳都會即時同步到雲端，換手機或重灌後登入同一帳號就能還原，不用手動備份。</li>
            <li>系統每天還會自動保存一份快照，萬一誤刪資料或想回到某一天，可以直接從快照還原。</li>
            <li>「刪除所有資料」會把帳戶、交易、預算、目標、訂閱、分帳紀錄全部永久刪除且無法復原，建議先匯出備份再刪。</li>
          </ul>
          <img src="/guide/data-export.png" alt="資料與備份頁面" className="w-full rounded-xl border" />
        </GuideSection>

        <GuideSection
          icon={<UserCog className="size-4.5" strokeWidth={1.75} />}
          title="帳號與升級"
          summary="個人資料、解鎖付費功能"
        >
          <p>更多 →「帳號設定」可以換大頭貼、姓名、基準幣別、記帳預設帳戶，或登出、刪除帳號。</p>
          <p>更多 →「升級」有兩種付費方式：</p>
          <ul>
            <li><strong>一次性解鎖</strong>：付一次錢永久解鎖多帳戶、進階統計、資料匯出、分帳本這些核心功能。</li>
            <li><strong>AI 訂閱</strong>：按月訂閱，解鎖 AI 記帳與收據辨識的較高使用額度，可以隨時在升級頁取消。</li>
          </ul>
          <img src="/guide/upgrade.png" alt="升級頁的兩種付費方案" className="w-full rounded-xl border" />
        </GuideSection>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        找不到答案？寄信到 <span className="text-foreground">antyk123@gmail.com</span>。
      </p>
    </div>
  );
}
