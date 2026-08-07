# 定期收支/訂閱新增帳戶選擇器

日期：2026-08-05

## 背景

稍早的[[定期收支付款方式]]聯動掃描時發現：`recurring_rules` 一直沒有讓使用者指定要用哪個帳戶，新增/編輯畫面永遠是靜默呼叫 `getDefaultAccountId()`，`updateRecurringRule` 甚至完全不接受 `accountId`（建立後就不能改）。這讓剛做的付款方式功能打了折扣——多帳戶使用者可以把某筆訂閱設成「信用卡」，但「一鍵入帳」實際扣款的帳戶不一定是那張卡對應的帳戶。當時先記錄成待辦，這次補上。

## 處理內容

- `subscriptions/actions.ts`：新增 `requireOwnedAccountId()`（比照 `createTransaction`/`updateTransaction` 既有的擁有權驗證模式，擋掉偽造的 accountId）；`createRecurringRule` 接受可選的 `accountId`，沒帶的話 fallback 回 `getDefaultAccountId`；`updateRecurringRule` 改為必填並驗證 `accountId`，寫入 `.set()`
- `subscriptions/page.tsx`：抓帳戶列表（`listAccounts` + 排除 `excludeFromNetWorth`，跟 `getQuickAddContext` 用同一套排除規則），傳給新增/每一列的編輯對話框
- `create-rule-dialog.tsx`／`edit-rule-dialog.tsx`：新增帳戶選擇按鈕列（沿用 `edit-transaction-dialog.tsx` 的 `AccountTypeIcon` 按鈕列 UI），只有帳戶數 > 1 時才顯示；選擇帳戶時會自動同步付款方式（`accountTypeToPaymentMethod`），跟其他表單一致
- `rule-row.tsx`：多帳戶時，列表項目的「下次日期」旁會顯示帳戶名稱

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。此為既有欄位（`recurringRules.accountId` schema 早就有），不需要 migration。
