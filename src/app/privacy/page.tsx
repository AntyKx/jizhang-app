import Link from "next/link";

export const metadata = {
  title: "隱私權政策 - 小熊記帳本",
};

function Clause({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">
        <span className="text-primary">{n}.</span> {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

function Fill({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">{children}</span>;
}

const subprocessors = [
  { name: "Clerk", use: "使用者帳號登入與身分驗證" },
  { name: "Neon", use: "資料庫代管，儲存您的記帳資料" },
  { name: "Vercel", use: "應用程式代管、伺服器運算與 AI Gateway 轉發" },
  { name: "Anthropic", use: "AI 文字記帳與收據辨識之語意解析（透過 Vercel AI Gateway 轉發）" },
  { name: "Stripe（規劃中）", use: "付費項目之金流處理，尚未上線，上線後將更新本政策" },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-600">
        <strong className="font-semibold">草稿・尚未經法律專業審閱。</strong>
        本文件僅供參考，正式生效前將經法律專業審閱確認。文中 <Fill>〔　　　〕</Fill> 標示之處尚待補充確認。
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">小熊記帳本</p>
        <h1 className="text-2xl font-semibold">隱私權政策</h1>
        <p className="text-xs text-muted-foreground">
          草擬日期：2026 年 7 月 29 日・資料控管者：個人開發者・聯絡信箱：antyk123@gmail.com
        </p>
      </div>

      <p className="text-sm text-muted-foreground">依《個人資料保護法》第 8 條蒐集個人資料告知事項編排。</p>

      <Clause n={1} title="蒐集者與聯絡方式">
        <p>
          本服務之個人資料蒐集者為提供本服務之個人開發者。如您對個人資料之蒐集、處理或利用有任何疑問，或欲行使個資法所賦予之權利，請透過{" "}
          <strong className="text-foreground">antyk123@gmail.com</strong> 與我們聯絡。
        </p>
      </Clause>

      <Clause n={2} title="蒐集之個人資料類別">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">帳號資訊：</strong>
            經第三方登入驗證服務（Clerk）蒐集之電子郵件地址、顯示名稱等註冊資訊。
          </li>
          <li>
            <strong className="text-foreground">財務記帳資料：</strong>
            您於本服務中建立之交易紀錄、金額、分類、付款方式、備註、商家名稱、帳戶與餘額、預算、儲蓄目標、訂閱／定期收支項目、分帳本紀錄等。
          </li>
          <li>
            <strong className="text-foreground">AI 輔助功能輸入內容：</strong>
            您於文字快速記帳輸入之文字內容、於收據辨識功能上傳之收據照片，用於 AI 解析產生記帳建議。
          </li>
          <li>
            <strong className="text-foreground">付款資訊（如您使用付費功能）：</strong>
            付款交易由第三方金流服務商處理，我們不會直接接觸或儲存您的信用卡卡號等敏感付款資料。
          </li>
          <li>
            <strong className="text-foreground">一般使用與技術紀錄：</strong>
            用於服務除錯與維運之基本技術性紀錄。
          </li>
        </ul>
      </Clause>

      <Clause n={3} title="蒐集之目的">
        <p>
          為提供記帳、預算、統計分析、AI 輔助記帳、分帳本、資料匯出等服務功能；處理您購買之付費項目；以及維護與改善服務品質之目的，蒐集並利用上述個人資料。
        </p>
      </Clause>

      <Clause n={4} title="利用期間">
        <p>自您註冊帳號起，至您刪除帳號或依本服務「資料與備份」頁面之功能請求刪除所有資料為止。</p>
      </Clause>

      <Clause n={5} title="利用地區">
        <p>因本服務使用之雲端主機、資料庫與 AI 服務供應商伺服器位於海外（主要為美國），您的個人資料可能傳輸至中華民國以外之地區進行處理與儲存。</p>
      </Clause>

      <Clause n={6} title="利用對象">
        <p>除本服務外，您的個人資料可能因服務運作需要，由下列第三方服務供應商處理：</p>
        <dl className="divide-y overflow-hidden rounded-2xl border bg-card">
          {subprocessors.map((s) => (
            <div key={s.name} className="flex flex-col gap-0.5 px-4 py-3">
              <dt className="font-medium">{s.name}</dt>
              <dd className="text-xs text-muted-foreground">{s.use}</dd>
            </div>
          ))}
        </dl>
      </Clause>

      <Clause n={7} title="利用方式">
        <p>以自動化電腦系統及網際網路傳輸方式處理前述個人資料。</p>
      </Clause>

      <Clause n={8} title="當事人權利">
        <p>
          依個資法規定，您就您的個人資料得向我們行使下列權利：查詢或請求閱覽、請求製給複製本、請求補充或更正、請求停止蒐集、處理或利用、請求刪除。您可透過本服務「資料與備份」頁面之刪除功能自行行使刪除權，或以{" "}
          <strong className="text-foreground">antyk123@gmail.com</strong> 聯絡我們協助處理其餘請求。
        </p>
      </Clause>

      <Clause n={9} title="不提供個人資料之後果">
        <p>若您不提供前述必要之個人資料（如帳號驗證所需之電子郵件），將可能導致您無法註冊或使用本服務之全部或部分功能。</p>
      </Clause>

      <Clause n={10} title="Cookie 與追蹤技術">
        <p>本服務目前未使用第三方廣告或行為追蹤之 Cookie。登入驗證服務（Clerk）可能於您的瀏覽器中存放維持登入狀態所必要之 Cookie 或類似技術。</p>
      </Clause>

      <Clause n={11} title="資料安全維護措施">
        <p>我們採取合理之技術與管理措施（如傳輸加密、存取權限控管）保護您的個人資料，惟無法保證絕對安全。如發生資料外洩等重大事件，我們將依法通知您及主管機關。</p>
      </Clause>

      <Clause n={12} title="未成年人使用">
        <p>
          本服務不主動蒐集未滿<Fill>〔　　　〕</Fill>歲之兒童或少年之個人資料。如您為未成年人，請於法定代理人同意及陪同下使用本服務。
        </p>
      </Clause>

      <Clause n={13} title="政策修改">
        <p>我們保留隨時修改本隱私權政策之權利，修改後將公告於本服務內。如屬蒐集目的、對象或利用方式之重大變更，將以顯著方式另行通知並徵得您之同意。</p>
      </Clause>

      <Link href="/terms" className="text-sm text-primary underline underline-offset-2">
        查看服務條款 →
      </Link>
    </div>
  );
}
