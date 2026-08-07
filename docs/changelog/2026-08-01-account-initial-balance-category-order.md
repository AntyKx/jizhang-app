# 帳戶期初餘額可修改 + 分類選單排序修正

日期：2026-08-01

## 帳戶期初餘額可修改

`updateAccount()`（`src/app/(app)/accounts/actions.ts`）新增 `initialBalance` 參數，`EditAccountDialog` 新增期初餘額欄位（用共用的 `AmountKeypadField`）。

`currentBalance`（目前餘額）是從期初餘額開始、每筆交易累加/累減出來的即時值，不是每次重算的。所以改期初餘額不能直接覆蓋 `currentBalance`，不然會把中間所有交易的效果洗掉——改成算出新舊期初餘額的差額，用同一個差額同時調整 `currentBalance`，這樣「改一開始打錯的數字」跟「中間記的每一筆帳」互不影響。

## 分類選單排序修正

使用者回報分帳的分類選單「有類型可以選，但不是我自己設定的類型跟順序」——查了一下，`/分類管理` 頁的拖曳排序（`sortOrder`）只有部分頁面的分類查詢真的有套用 `.orderBy(categories.sortOrder)`，另外幾個頁面查詢時忘記加，分類就照資料庫預設順序（近似建立時間）顯示，跟使用者自己排好的順序對不上。

補上 `.orderBy(categories.sortOrder)` 的頁面：`/shared`、`/transactions`、`/subscriptions`、`/budgets`、`/accounts/[id]`。（AI 快速記帳用的 API route 內部查詢只是餵給 LLM 比對分類名稱，不影響任何畫面排序，這次沒有動。）

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
