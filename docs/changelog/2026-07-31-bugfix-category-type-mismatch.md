# 修 bug：切換類型分類殘留、分帳分類混到收入

日期：2026-07-31

## 背景

主動掃了一輪這兩天改動比較大的檔案（記帳頁重構、全域「+」、分類選擇器），找到兩個問題。

## 處理內容

### 1. 編輯交易/AI 記帳草稿切換類型時，分類殘留成錯誤類型

`edit-transaction-dialog.tsx`、`record/text-quick-add.tsx`、`record/receipt-scan-quick-add.tsx` 這三個地方，切換「支出/收入」類型時，分類清單會跟著換，但選中的 `categoryId` 沒有一起清掉。畫面上看起來分類欄位變成「選擇分類」（因為舊分類不在新清單裡顯示不出來），但底層狀態還記著舊的分類 ID——如果沒有重新選分類就直接存，會存進一筆類型跟分類對不起來的交易（例如類型改成收入，分類卻還是支出類別），伺服器端也沒擋這個。

修法：三個地方的「類型」`onValueChange` 都加上「類型真的改變時，把 `categoryId` 一併清空」。這是原本就有的問題，不是這兩天新增的。

### 2. 分帳支出的分類清單混了收入分類

分帳支出理論上只該是支出類別，但 `shared/page.tsx` 的分類查詢沒有過濾 `type`，收入分類（薪水、獎金…）也會混進選單。加上 `eq(categories.type, "expense")` 過濾。另外首頁跟全域「+」重用 `AddSharedExpenseDialog` 時，傳入的分類清單是共用的 `getQuickAddContext`（沒過濾類型），這兩處呼叫也加上 `.filter(c => c.type === "expense")`。

## 驗證

`tsc --noEmit`、`eslint .`、`next build` 全過。已用 `npx vercel --prod` 部署。
