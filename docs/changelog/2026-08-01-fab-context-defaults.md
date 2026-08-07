# 全域「+」依頁面情境帶入預設值

日期：2026-08-01

## 需求

行事曆頁點某一天後按「+」，新增的記帳應該預設在那一天，不是今天；帳戶明細頁按「+」，新增的記帳應該預設在那個帳戶，不用自己重選。

## 處理內容

`GlobalQuickAddFab`（`src/components/global-quick-add-fab.tsx`）掛在 `(app)/layout.tsx`，跟每個頁面是平行關係、不是子關係，沒有現成管道知道「使用者現在在看哪一天/哪個帳戶」。因為行事曆選日期跟帳戶明細頁本來就已經反映在網址上（`/calendar?day=2026-08-01`、`/accounts/<id>`），FAB 直接用 `usePathname()`／`useSearchParams()` 從網址推導：

- `pathname === "/calendar"` 時，取 `day` 這個 query param 當 `defaultDate`
- `pathname` 符合 `/accounts/<id>` 時，取路徑上的 id 當 `contextAccountId`——但只有這個 id 真的在快速記帳可選的帳戶清單裡才採用，避免帳戶明細頁是封存帳戶或「不記入資產」帳戶時（這兩種本來就不在快速記帳選單裡）硬塞一個選不到的帳戶

這兩個值往下傳進三種記帳方式：

- **一般記帳**（`QuickAddCategoryFlow`）：新增 `defaultAccountId`／`defaultDate` 可選 prop，決定金額頁初始的帳戶跟日期
- **AI 記帳**（`TextQuickAdd`／`ReceiptScanQuickAdd`）：日期只在 AI 解析失敗的手動補值情境套用（收據掃描本身有印刷日期，不该被頁面情境蓋過）；文字快速記帳額外把 `defaultDate` 當「今天」的參考日期送進 `/api/quick-add`，讓 AI 解析「昨天」「今天」這種相對日期時基準是使用者選的那一天，不是真的今天
- **分帳記帳**（`AddSharedExpenseDialog`）：日期欄位從 `defaultValue`（只在第一次掛載生效）改成 controlled state，掛載後在對話框「打開」的當下重新帶入 `defaultDate`——因為這個元件被 FAB 常駐掛著，不會每次開關都重新掛載，純 `defaultValue` 只會套用一次就過期

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過（`useSearchParams` 沒有觸發 Suspense 邊界問題，因為這個 App 底下每個路由本來就已經是動態渲染，不是靜態預生成）。已用 `npx vercel --prod` 部署。
