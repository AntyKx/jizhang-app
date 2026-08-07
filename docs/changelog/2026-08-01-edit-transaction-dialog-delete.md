# 交易編輯視窗新增刪除按鈕

日期：2026-08-01

## 背景

使用者反應帳戶明細頁看到的交易應該能刪除跟編輯。查下去發現這其實不是帳戶明細頁獨有的問題——`EditTransactionDialog`（點一筆一般收支交易跳出的編輯視窗）本來就只有「儲存」，沒有刪除功能，`/transactions` 全部交易頁的明細列表也是同一個問題（都共用 `TransactionsList`／`EditTransactionDialog`）。行事曆、首頁用的 `TodayTransactionRow` 因為有滑動刪除，本來就沒這個問題。

## 處理內容

`EditTransactionDialog`（`src/components/record/edit-transaction-dialog.tsx`）的底部按鈕列新增「刪除」（destructive 樣式），呼叫既有的 `deleteTransaction()`。這個 action 本來就有分帳結算保護（已結算的分帳來源交易會擋下刪除並顯示錯誤訊息），這裡直接沿用不用另外處理。

因為 `/accounts/[id]` 的「明細」頁籤跟 `/transactions` 都是共用同一個 `TransactionsList`／`EditTransactionDialog`，這次修一次全部生效，不用個別頁面改。

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
