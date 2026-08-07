# 淨資產趨勢圖時區誤差修正

日期：2026-07-29

## 背景

使用者問統計報表有沒有誤差，逐一比對了首頁「本月支出」、`/budgets` 的月支出、`/stats` 各分頁（總覽、日常分析、進階分析、預算與目標）的收入/支出/分類/預算計算邏輯——全部都一致用 `occurredAt` 落在月曆月份區間、`type` 精準比對 `income`/`expense`（自然排除 `transfer`）、`Number(amount) * Number(exchangeRate)` 換算台幣，沒有找到互相對不上的地方。

唯一找到的真實誤差在 `src/lib/stats/networth-queries.ts` 的 `getNetWorthTrend`（淨資產趨勢圖）：判斷「這個帳戶在某個月份邊界前是否已存在」用了 `date-fns` 的 `format(acc.createdAt, "yyyy-MM-dd")`，直接格式化資料庫的 `timestamp` 欄位。伺服器在 Vercel 上跑在 UTC，`format()` 讀的是執行環境的本地時區——這正是 `src/lib/date.ts` 檔案開頭註解警告過的反樣式（[[project_jizhang_timezone]] 之前修的是同一類問題，但只涵蓋了「今天」相關的邏輯，這次是格式化任意過去時間戳）。實際影響：在台北時間凌晨 0-8 點建立的帳戶，`createdAt` 格式化出來的日期會少一天，可能讓淨資產趨勢圖在該帳戶剛建立的那個月份邊界算錯一天份的餘額。

## 處理內容

`src/lib/date.ts` 新增 `formatDateInTaipei(date)`——`todayInTaipeiString()` 的通用版本，可以格式化任意 `Date`/字串成台北時間的 `"yyyy-MM-dd"`，不只是「現在」。`networth-queries.ts` 改用這個函式取代 `date-fns` 的 `format()`。全專案搜尋過，這是唯一一處對 DB `timestamp` 欄位直接用 `format()` 的地方。

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。
