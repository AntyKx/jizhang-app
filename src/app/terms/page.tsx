import Link from "next/link";
import { BackLink } from "@/components/back-link";

export const metadata = {
  title: "服務條款 - 小熊記帳本",
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

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <BackLink href="/more" label="更多功能" />
      <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-600">
        <strong className="font-semibold">草稿・尚未經法律專業審閱。</strong>
        本文件僅供參考，正式生效前將經法律專業審閱確認。文中 <Fill>〔　　　〕</Fill> 標示之處尚待補充確認。
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">小熊記帳本</p>
        <h1 className="text-2xl font-semibold">服務條款</h1>
        <p className="text-xs text-muted-foreground">
          草擬日期：2026 年 7 月 29 日・資料控管者：個人開發者・聯絡信箱：antyk123@gmail.com
        </p>
      </div>

      <p className="text-sm text-muted-foreground">適用於「小熊記帳本」App 與網頁服務（以下稱「本服務」）。</p>

      <Clause n={1} title="適用範圍與接受條款">
        <p>
          本服務由個人開發者（以下稱「我們」）提供，尚未以公司或行號名義登記。當您註冊帳號、登入或使用本服務任何功能時，即表示您已閱讀、瞭解並同意接受本服務條款之全部內容。如您不同意本條款之任何部分，請勿使用本服務。
        </p>
      </Clause>

      <Clause n={2} title="服務內容說明">
        <p>
          本服務提供個人財務記帳相關功能，包括但不限於：交易紀錄、多帳戶／多幣別管理、預算設定、儲蓄目標、訂閱與定期收支提醒、行事曆與統計報表、分帳本，以及 AI 輔助記帳（文字快速記帳、收據辨識）與資料匯出。
        </p>
        <div className="rounded-2xl bg-muted/40 p-4 text-muted-foreground">
          <strong className="text-foreground">AI 功能的準確性提醒：</strong>
          文字快速記帳與收據辨識功能是將您輸入的文字或上傳的收據照片，透過第三方 AI 服務進行解析後產生建議的記帳內容。AI
          解析結果可能有誤判、遺漏或不準確之情形，最終記帳內容仍由您確認送出。我們不保證 AI 解析結果之正確性，您應自行核對金額、分類等資訊後再確認儲存。
        </div>
      </Clause>

      <Clause n={3} title="帳號註冊與使用者責任">
        <p>
          您於註冊時應提供真實、正確且完整之資訊，並妥善保管帳號登入憑證。因您帳號登入資訊保管不當所生之損失，除可歸責於我們之事由外，由您自行負責。本服務之登入驗證由第三方服務供應商（Clerk）提供。
        </p>
      </Clause>

      <Clause n={4} title="付費項目">
        <p>
          <strong className="text-foreground">一次性解鎖：</strong>
          付費解鎖本服務之核心功能後，於本服務持續營運期間，您可永久使用當時已解鎖之功能範圍，無需再次付費。本服務未來版本可能新增功能，是否納入既有解鎖範圍將另行公告。
        </p>
        <p>
          <strong className="text-foreground">AI 訂閱：</strong>
          AI 記帳相關進階額度採定期扣款訂閱制，按月自動續訂並扣款，您可隨時於<Fill>付款管理頁面</Fill>取消訂閱，取消後於當期到期後停止續訂，當期已扣款之費用原則上不予退還。
        </p>
        <p>
          <strong className="text-foreground">退款：</strong>
          依「通訊交易解除權合理例外情事適用準則」，數位服務／內容於您開始使用後，可能不適用一般網路交易之七日猶豫期。若您於購買後因服務有重大瑕疵無法正常使用，請於<Fill>〔　　　〕</Fill>日內來信聯絡我們協助處理。
        </p>
      </Clause>

      <Clause n={5} title="使用限制">
        <ul className="list-disc space-y-1 pl-5">
          <li>不得將帳號轉讓、出借或轉售予第三人。</li>
          <li>不得以任何自動化方式（如腳本、機器人）大量呼叫本服務之 AI 相關功能，以避免影響服務穩定性及不合理消耗第三方 AI 服務用量。</li>
          <li>不得對本服務進行反向工程、反編譯，或以任何方式規避本服務之付費限制。</li>
          <li>不得利用本服務從事任何違反中華民國法令之行為。</li>
        </ul>
      </Clause>

      <Clause n={6} title="智慧財產權">
        <p>
          本服務之程式、介面設計、圖示與插畫等內容之智慧財產權歸我們所有。您於本服務中輸入之記帳資料（交易紀錄、備註等）之權利歸您所有，我們僅為提供服務之目的處理該等資料。
        </p>
      </Clause>

      <Clause n={7} title="免責聲明與責任限制">
        <p>
          本服務按「現況」提供，我們不保證服務不中斷、無錯誤，亦不保證資料永久不會遺失。本服務不構成任何投資理財、稅務或會計專業建議，僅為個人記帳輔助工具。在法律允許之最大範圍內，我們對因使用或無法使用本服務所生之損害不負賠償責任；如仍須負責，賠償總額以您於發生該事由前十二個月內就本服務實際支付之金額為上限。
        </p>
      </Clause>

      <Clause n={8} title="資料備份與遺失">
        <p>
          我們會採取合理措施維護伺服器與資料庫穩定，但仍建議您定期使用本服務「資料與備份」頁面之匯出功能（CSV／Excel／月報表）自行備份重要財務資料。因不可抗力或非可歸責於我們之事由導致資料遺失，我們不負賠償責任。
        </p>
      </Clause>

      <Clause n={9} title="服務中止或終止">
        <p>
          我們保留因技術維護、服務調整或終止營運而暫停或終止本服務之權利，並將於合理期間前以<Fill>App 內公告／email</Fill>通知已付費使用者。因服務終止而無法使用已付費之解鎖功能時，我們將依實際使用期間評估是否提供部分退款。
        </p>
      </Clause>

      <Clause n={10} title="準據法與管轄法院">
        <p>
          本條款之解釋與適用，以及與本條款有關之爭議，均應依照中華民國法律予以處理，並以<Fill>〔　　　地方法院〕</Fill>為第一審管轄法院。
        </p>
      </Clause>

      <Clause n={11} title="條款修改">
        <p>我們保留隨時修改本條款之權利。修改後之條款將公告於本服務內，如屬重大變更，將另行以顯著方式通知。您於修改後繼續使用本服務，視為同意修改後之條款。</p>
      </Clause>

      <Clause n={12} title="聯絡方式">
        <p>
          如對本條款有任何疑問，請透過 <strong className="text-foreground">antyk123@gmail.com</strong> 與我們聯絡。
        </p>
      </Clause>

      <Link href="/privacy" className="text-sm text-primary underline underline-offset-2">
        查看隱私權政策 →
      </Link>
    </div>
  );
}
