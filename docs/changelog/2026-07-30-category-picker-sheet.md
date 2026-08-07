# 分類選擇改用熊熊格子 Sheet

日期：2026-07-30

## 背景

使用者反應編輯交易時的「分類」欄位是純文字下拉選單（shadcn `Select`），分類一多就變成一長串直的清單往下展開，把付款方式、帳戶等後面的欄位都蓋住。截圖顯示 15 個分類的下拉選單幾乎佔滿整個畫面。

## 處理內容

新增共用元件 `src/components/categories/category-picker-sheet.tsx`：外觀是一顆跟原本 `SelectTrigger`相同樣式的按鈕（顯示目前選中的分類圖示+名稱，右側 chevron），點下去改成彈出 BottomSheet，裡面是跟記帳頁一樣的熊熊格子（多欄排列，不是單欄清單），選一個就關閉。格子第一個固定是「不指定」，讓可選填的分類欄位能清除選擇。

換掉以下 6 個原本用 `<Select>` 選分類的地方：
- `record/edit-transaction-dialog.tsx`（就是使用者截圖的那個「編輯交易」）
- `record/text-quick-add.tsx`、`record/receipt-scan-quick-add.tsx`（AI 記帳草稿編輯）
- `shared/text-quick-add.tsx`、`shared/edit-expense-dialog.tsx`、`shared/add-expense-dialog.tsx`（分帳新增/編輯支出）

「類型」（收入/支出）的下拉選單維持不變，只有分類的改掉——類型選項只有 2 個，不會有欄位過長的問題。

分帳這幾個檔案原本的分類資料只有 `{id, name}`（沒有存圖示），改用熊熊格子需要圖示，所以 `shared/page.tsx` 的分類查詢多撈了 `icon` 欄位，5 個 shared 元件裡各自重複宣告的 `Category` 型別也一併補上 `icon` 欄位。`add-expense-dialog.tsx` 是原生表單送出（沒有 controlled state），比照先前金額欄位的做法，改成 controlled state + 同名 hidden input，伺服器端 action 不用改。

## 驗證

`tsc --noEmit`、`eslint .`、`next build` 全過。已用 `npx vercel --prod` 部署。

## 更新：訂閱的分類也換掉

漏了訂閱／定期收支的新增跟編輯對話框（`subscriptions/create-rule-dialog.tsx`、`edit-rule-dialog.tsx`），補上跟其他地方一樣的改法：`subscriptions/page.tsx` 的分類查詢加 `icon` 欄位，兩個對話框（原本是未受控表單）改成 controlled `categoryId` state + hidden input，換成 `CategoryPickerSheet`。`rule-row.tsx` 裡也重複宣告了一份 `Category` 型別，一併補上 `icon` 欄位。

`tsc --noEmit`、`eslint .`、`next build` 全過，已部署。
