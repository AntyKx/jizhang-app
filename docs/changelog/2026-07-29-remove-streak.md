# 移除連續記帳天數功能

日期：2026-07-29

## 背景

使用者覺得「連續記帳天數」這個統計卡沒什麼意義——只是跟收入/支出/結餘並排的一個數字，沒有里程碑、沒有提醒，`longestStreak`（最長連續天數）欄位甚至整個 App 都沒有任何地方顯示。討論後決定直接拿掉，不做替代呈現。

## 處理內容

- 刪除 `src/lib/streak.ts`（`bumpStreak`）。
- `src/app/(app)/transactions/actions.ts`：`createTransaction`、`duplicateTransaction` 移除 `bumpStreak` 呼叫與 import。
- `src/app/(app)/stats/page.tsx`：移除「連續記帳天數」卡片、`streak` 變數、多餘的 `userSettings` 查詢；總覽卡片格數從 `grid-cols-2 sm:grid-cols-4`（4 張卡）改成 `grid-cols-3`（剩收入/支出/結餘 3 張卡，一列排滿）。
- `src/db/schema.ts`：`userSettings` 移除 `currentStreak`、`longestStreak`、`lastEntryDate` 三個欄位，並用 `drizzle-kit push --force` 把欄位從 Neon production 資料庫刪除（二次執行確認 "No changes detected"）。

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。
