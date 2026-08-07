# 首頁分區塊載入（Suspense 拆分）

日期：2026-08-03

## 背景

延續昨天啟動體驗規格單討論的第 8 點：`/record` 原本是一個大 `Promise.all` 把使用者資料（Clerk API）、今日/本月支出加總、預算、到期訂閱、今日交易明細一次讀完，才整頁一次渲染成 `RecordScreen`（單一大 Client Component）。任何一個環節慢（尤其是 Clerk 那次外部 API 呼叫），整頁——包含使用者最想先用的「快速記帳」區塊——都會被一起卡住。

## 處理內容

拆成 4 個各自獨立的區塊：

1. **快速記帳**（`quick-add-section.tsx`，AI 輸入列＋分類格）——**不包 Suspense**，同步渲染。它需要的分類/帳戶資料在 `(app)/layout.tsx` 就已經讀過並用 `cache()` 快取，這裡再讀一次是免費的，不是拖慢首頁的原因，所以讓它跟骨架屏同時出現，不用等其他區塊。
2. **今日/本月摘要卡片**（`home-summary-section.tsx`）——自己的 Suspense，內含 Clerk 的 `currentUser()`（整頁最可能慢的外部呼叫）+ 今日/本月支出加總查詢。金額只查 SUM，不重用完整交易列表，避免兩個區塊互搶同一份資料。
3. **到期訂閱卡片**（`due-subscriptions-section.tsx`）——自己的 Suspense，`fallback={null}`（沒有骨架屏）——這張卡片大多數時候是空的（沒有到期項目時整個不顯示），硬做一個骨架屏只會在多數情況下「跳出來又消失」，比不做還讓畫面更抖。
4. **「今天記了 N 筆」列表**（`today-transactions-section.tsx`）——自己的 Suspense，帶列表形狀的骨架屏。

`record/page.tsx` 改成直接渲染這 4 塊，每塊各自包一層 `<Reveal>`（原本的淡入動畫），讓每個區塊資料一到就各自淡入，而不是整頁一次跳出來。原本的 `record-screen.tsx`（單一大 Client Component）已刪除，功能拆到上述元件。

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
