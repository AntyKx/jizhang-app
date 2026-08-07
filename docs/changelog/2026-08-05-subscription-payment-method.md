# 定期收支/訂閱新增付款方式

日期：2026-08-05

## 背景

查了一下發現「訂閱 / 定期收支」（`recurring_rules` 資料表）從一開始就沒有付款方式欄位——一般交易（`transactions`）早就有這個欄位，但定期收支沒有，導致「一鍵入帳」把到期的訂閱項目轉成正式交易時，付款方式永遠固定是「現金」，不管實際上是信用卡自動扣款還是別的方式。

## 處理內容

- `src/db/schema.ts`：`recurringRules` 新增 `paymentMethod` 欄位（`payment_method` enum，預設 `cash`），已用 `drizzle-kit push` 套用到 Neon
- `subscriptions/actions.ts`：`createRecurringRule`／`updateRecurringRule` 的 Zod schema 跟寫入邏輯都加上這個欄位；`postRecurringOccurrence`（一鍵入帳）現在會把規則本身設定的付款方式帶進實際產生的交易，不再固定寫死現金
- `create-rule-dialog.tsx`／`edit-rule-dialog.tsx`：新增付款方式選擇（沿用 `edit-transaction-dialog.tsx` 那套按鈕列 UI）。新增訂閱預設選「自動扣款」而不是跟其他表單一樣預設「現金」——大多數訂閱本來就是自動扣款，這個預設比較符合實際情況
- `rule-row.tsx`：列表上的每一項現在會顯示付款方式圖示

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署，schema 變更已推送到 production 資料庫並驗證欄位存在。
