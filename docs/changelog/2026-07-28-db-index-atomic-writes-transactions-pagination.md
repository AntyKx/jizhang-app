# 資料庫索引、交易寫入原子性、交易列表分頁

日期：2026-07-28

## 背景

針對「有什麼可以優化的」做了一次程式碼審查，找到三個值得處理的項目：`schema.ts` 完全沒有索引、多步驟金額異動沒有交易保護、`/transactions` 列表固定抓最新 200 筆沒有分頁。

## 處理內容

1. **`src/db/schema.ts` 加索引**：`transactions` 加 `(user_id, occurred_at)`、`(user_id, account_id)`、`(user_id, category_id)`；`budgets` 加 `(user_id, month)`；`recurring_rules` 加 `(user_id)` 與 `(user_id, next_occurrence)`；`accounts`、`categories`、`shared_expenses`、`savings_goals` 各加 `(user_id)`。已用 `drizzle-kit push` 套用到 Neon production 資料庫（第二次 push 回報 "No changes detected" 確認已生效）。

2. **`src/app/(app)/transactions/actions.ts` 改用 `db.batch()`**：`createTransaction`/`createTransfer`/`updateTransaction`/`deleteTransaction`/`duplicateTransaction` 原本是依序多個獨立 `await db...`（insert 交易 → update 帳戶餘額 → 可能再 insert/update/delete 共同帳），任何一步中途失敗就會留下餘額對不上的髒資料。專案用的是 `@neondatabase/serverless` 的 neon-http driver，`db.transaction(callback)` 在這個 driver 下會直接 throw（`"No transactions support in neon-http driver"`），但 drizzle 對 neon-http 有另外支援 `db.batch([...])`——把多個 query builder（不能有互相依賴上一步「執行後」結果的情況）打包成一次 HTTP 請求，由 Neon 端當一個交易執行。`createTransaction` 因為共同帳 insert 需要引用新交易的 id，改成呼叫端先用 `crypto.randomUUID()` 產生 id 再一起塞進 batch，避免掉這個相依性。

3. **`/transactions` 列表分頁**：新增 `src/lib/transactions/list-types.ts` 集中放列表相關型別與 `TRANSACTIONS_PAGE_SIZE = 50`；`page.tsx` 首屏只抓 50 筆並算出 keyset cursor（`occurredAt` + `createdAt` tiebreaker）；新增 server action `loadMoreTransactions(cursor)`，`TransactionsList` 改成 client-side 累積 state，捲到底按「載入更多」再抓下一頁、append 進現有清單，搜尋框沿用既有的 client-side 篩選（只篩已載入的項目）。

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過，`drizzle-kit push` 二次執行確認索引已套用到 production 資料庫。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。

## 風險與後續

`db.batch()` 底層是 Neon HTTP 的單一交易端點，語意上等同資料庫交易（全部成功或全部回滾），但沒有實際模擬過中途失敗的情境去驗證；如果之後要加新的多步驟金額異動邏輯，記得延用同一個 `db.batch([...])` pattern，不要退回成分開的 `await`。
