# 轉帳手續費欄位

日期：2026-07-30

## 背景

轉帳（例如跨行轉帳、ATM 提款）常常會有手續費，之前的轉帳功能沒有地方記錄這筆錢。

## 處理內容

- `transactions` 表新增 `feeAmount`（預設 0，只有 `type="transfer"` 時有意義）
- `createTransfer`：轉出帳戶扣 `amount + fee`，轉入帳戶只加 `amount`——手續費是付給銀行/服務商的錢，不會到轉入帳戶，只從轉出帳戶那邊消失。同時補上轉帳原本就沒設定的 `exchangeRate`（抓轉出帳戶當下的匯率），確保外幣帳戶手續費在淨資產計算時換算正確
- `deleteTransaction` 刪除轉帳時，退回轉出帳戶的金額改成 `amount + feeAmount`（原本只退 `amount`，手續費之前就算有記錄也不會退回——這次一併修正）
- `getNetWorthTrend`：轉帳手續費會讓淨資產減少對應金額（轉帳本身金額因為在自己名下的兩個帳戶之間移動，加總還是互相抵銷為零，手續費是真正離開整個資產組合的錢）
- UI：轉帳對話框加「手續費（選填）」輸入欄；轉帳列表（帳戶頁的轉帳紀錄、交易列表）有手續費時會顯示出來；CSV/Excel 資料匯出也加了手續費欄位

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。
