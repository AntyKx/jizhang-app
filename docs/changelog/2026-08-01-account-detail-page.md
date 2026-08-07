# 帳戶明細頁面

日期：2026-08-01

## 背景

「帳戶管理」原本點一個帳戶進去只會跳出編輯用的對話框，看不到這個帳戶實際的收支狀況，只有列表上那個活生生的目前餘額。使用者要求點進帳戶要能看明細，而且要能分月份切換，才能比較準確掌握這個帳戶的狀況。

## 處理內容

### 新頁面 `/accounts/[id]`
- 上方：帳戶名稱/類型 + 返回帳戶管理的按鈕
- `AccountMonthNav`（`src/components/accounts/account-month-nav.tsx`）：純月份切換（上一月／本月／下一月），複用 `resolveStatsRange` 的月份運算，但拿掉週/年單位切換——帳戶明細只有「按月瀏覽」有意義
- `AccountDetailTabs`（`src/components/accounts/account-detail-tabs.tsx`）：兩個頁籤
  - **總覽**：目前餘額（即時值，非該月月底餘額——沒有做歷史餘額回溯）+ 該月收入/支出/淨額
  - **明細**：該月屬於這個帳戶的交易（一般收支 + 轉入轉出的轉帳），直接複用 `TransactionsList` 元件（含搜尋、編輯、刪除，都是既有能力）

### 帳戶列表的互動調整
`src/components/accounts/accounts-list.tsx`：點卡片標題原本是打開編輯對話框，現在改成導覽到新的明細頁；原本編輯對話框的入口移到卡片右上一顆新的鉛筆圖示按鈕，功能沒有減少，只是多一層。

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
