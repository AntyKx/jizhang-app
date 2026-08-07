# 「共同帳」全面改名為「分帳」

日期：2026-07-30

## 處理內容

把所有面向使用者的文字從「共同帳／共同帳本／共同支出」統一改成「分帳／分帳本／分帳支出」，範圍包括：

- 底部導覽列標籤（`main-nav.tsx`）
- 記帳流程的「算共同帳」切換開關（`shared-expense-toggle.tsx`）
- 分帳頁面標題、空狀態文字、圖表標題（`shared/dashboard.tsx`）
- 新增/編輯分帳支出對話框標題（`add-expense-dialog.tsx`、`edit-expense-dialog.tsx`）
- 分帳本夥伴名稱按鈕（`partner-name-dialog.tsx`）
- 刪除所有資料的確認文字、資料匯出頁說明（`delete-all-data-dialog.tsx`、`data-export/page.tsx`）
- 服務條款、隱私權政策提到的功能清單（`terms/page.tsx`、`privacy/page.tsx`）
- `/upgrade` 頁面的功能標籤與說明文字
- 交易編輯/刪除時，連結到已結算分帳紀錄的錯誤訊息、分帳支出的預設項目名稱（`transactions/actions.ts`、`shared/actions.ts`）
- AI 分帳快速記帳的 prompt 文字（`api/shared-quick-add/route.ts`）
- `db/schema.ts` 裡描述性的程式碼註解（非使用者可見，但為了跟功能名稱一致一併更新）

**沒有改的**：`/shared` 這個路由本身的網址、程式碼裡的變數/元件命名（`sharedExpenses` 資料表、`SharedExpenseToggle` 元件等）維持英文 `shared` 不變，只改中文顯示文字；另外分類圖示裡的「共同存款」是不相關的儲蓄類別名稱，沒有一併改動。

## 驗證

`tsc --noEmit`、`eslint .`、`next build` 全過。已部署。
