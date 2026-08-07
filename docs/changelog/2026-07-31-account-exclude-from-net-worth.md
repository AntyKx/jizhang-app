# 帳戶新增「不記入資產」選項（定存帳戶用）

日期：2026-07-31

## 背景

想把定存這類「不會日常花用」的帳戶記錄下來，但不想讓它：
1. 灌水淨資產數字
2. 出現在一般記帳的帳戶選擇裡

但轉帳、帳戶管理頁面還是要看得到、用得到（存錢進去、到期領出來都要透過轉帳）。

## 處理內容

- `accounts` 資料表新增 `exclude_from_net_worth` 欄位（布林值，預設 false），已用 `drizzle-kit push` 套用到 Neon
- 新增/編輯帳戶對話框都加了「不記入資產」切換開關，說明文字：「例如定存帳戶：淨資產不計入，記帳時也不會出現可選」
- **淨資產計算**兩處都排除勾選的帳戶：`accounts/page.tsx` 的淨資產卡片、`lib/stats/networth-queries.ts` 的 6 個月趨勢圖
- **一般記帳的帳戶選擇**排除勾選的帳戶：`lib/quick-add-context.ts`（餵給首頁跟全域「+」的一般記帳/AI記帳）、`transactions/page.tsx`（所有交易列表的編輯）、`calendar/page.tsx`（行事曆當日明細的編輯）
- `getDefaultAccountId`（新用戶自動建帳本、定期收支沒指定帳戶時的預設帳戶邏輯）也排除這類帳戶，避免訂閱扣款之類的自動入帳意外記到定存帳戶上
- **轉帳維持不受影響**：`transfer-dialog.tsx` 走自己的 `listAccounts` 查詢，沒有套用這個過濾，定存帳戶可以正常轉入轉出
- 帳戶管理頁面的帳戶列表也維持顯示所有帳戶（含定存），卡片上加了「不記入資產」小標籤

## 驗證

`tsc --noEmit`、`eslint .`、`next build` 全過，`drizzle-kit push` 套用 schema 變更成功。已用 `npx vercel --prod` 部署。
