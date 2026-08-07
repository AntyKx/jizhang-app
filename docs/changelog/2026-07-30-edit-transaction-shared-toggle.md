# 編輯交易加上「算共同帳」選項

日期：2026-07-30

## 背景

新增支出時可以勾選「這筆算共同帳」，但編輯既有交易的對話框（`EditTransactionDialog`）沒有這個欄位——如果一開始漏勾，或是想把已經記錄的支出改成共同帳，之前完全沒地方改。

## 處理內容

- `EditTransactionDialog` 加上 `SharedExpenseToggle`（跟新增流程共用同一顆元件），只在類型為「支出」時顯示；需要多一個 `partnerName` prop，跟著 `categories`/`accounts` 一起往下傳
- `updateTransaction`（`transactions/actions.ts`）新增 `isSharedExpense` 參數，把原本「有沒有共同帳連結」的兩種情況（同步／刪除）擴充成完整四種：
  - 本來就是共同帳、還是共同帳 → 照舊同步共同帳金額/分類/日期
  - 本來是共同帳、取消勾選或改成收入 → 刪除共同帳連結列（原本只在「改成非支出」時才刪，現在使用者主動取消勾選也會刪）
  - 本來不是共同帳、勾選了 → 新增一筆共同帳連結列（沿用 `createTransaction` 建立共同帳列的邏輯：`paidByMe=true`）
  - 都不是 → 單純更新交易本身
- 由於 `EditTransactionDialog` 在三個入口都會用到（`transactions-list.tsx` 交易列表、`today-transaction-row.tsx` 首頁「今天記了 N 筆」、`calendar/page.tsx` 行事曆當日明細），這三處的交易查詢都補上 `leftJoin(sharedExpenses)` 算出 `isSharedExpense`，並且都補上 `partnerName`（`transactions/page.tsx`、`calendar/page.tsx` 各自查一次 `userSettings`；`record/page.tsx` 本來就有）

## 驗證

`tsc --noEmit`、`eslint .`、`next build` 全過。已用 `npx vercel --prod` 部署。
