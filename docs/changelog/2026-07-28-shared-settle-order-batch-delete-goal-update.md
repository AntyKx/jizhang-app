# 共同帳結算順序修正、刪除全部資料原子化、目標貢獻合併寫入

日期：2026-07-28

## 背景

延續同一天稍早的優化審查（索引、`transactions/actions.ts` 原子性、交易列表分頁），再檢查了其餘幾個 server action 檔案，找到一個真的資料不一致 bug 跟兩個可以順手做的小優化。

## 處理內容

1. **`src/app/(app)/shared/actions.ts`：修正結算順序（真 bug）**
   `settleSharedExpense`／`settleAllSharedExpenses` 原本是「先把共同支出標記 `isSettled=true` → 再呼叫 `createTransaction` 記一筆結算交易」。如果 `createTransaction` 中途失敗（例如外幣帳戶的匯率 API 打不通），會變成畫面顯示「已結清」但實際上完全沒記到任何一筆交易——而且已結清的項目不能再編輯/刪除，等於錢就這樣不見。改成先成功建立交易、確認沒 throw 之後才標記已結清；失敗時共同帳項目維持未結清狀態，可以重試。（順帶確認過 `subscriptions/actions.ts` 的 `postRecurringOccurrence` 本來就是正確順序：先建交易再推進 `nextOccurrence`，沒有改。）

2. **`src/app/(app)/data-export/actions.ts`：`deleteAllUserData` 改用 `db.batch()`**
   原本是 8 個資料表照 FK 順序（children → parents）依序 `await db.delete(...)`，註解裡也寫著「neon-http 沒有交易支援，所以只能循序執行」。這是上一輪才發現 neon-http 其實支援 `db.batch([...])`（見 `project_jizhang_db_batch_atomicity` 記憶）之後可以直接解掉的舊債：8 個刪除互相沒有執行結果的相依性，改成一次 `db.batch([...])` 送出，維持原本的 FK 順序，但變成 Neon 端單一原子交易，也少掉 7 次額外的 HTTP 往返。

3. **`src/app/(app)/goals/actions.ts`：`contributeToGoal` 合併成單一 update**
   原本是「update `currentAmount` → 讀回傳值判斷是否達標 → 視情況再 update `isCompleted`」兩次寫入。改成一次 `update` 用 SQL 運算式 `(current_amount + amount) >= target_amount` 直接算出 `isCompleted`，少一次往返，也不再有「第一次 update 成功但第二次失敗，導致金額已加但完成旗標沒同步」的邊角情況。

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。
