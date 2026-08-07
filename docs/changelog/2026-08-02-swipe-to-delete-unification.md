# 統一為「右滑刪除」

日期：2026-08-02

## 問題

全 App 掃了一輪各種明細列表的刪除方式，發現真的不一致：

| 位置 | 元件 | 原本的刪除方式 |
|---|---|---|
| 行事曆／首頁「今天記了 N 筆」 | `TodayTransactionRow` | 右滑刪除（唯一原本就對的） |
| `/transactions`、`/accounts/[id]` 明細（一般收支） | `TransactionsList` `RegularRow` | 點進編輯視窗才能刪 |
| `/transactions`、`/accounts/[id]` 明細（轉帳） | `TransactionsList` `TransferRow` | 固定顯示的垃圾桶圖示按鈕 |
| `/shared` 分帳明細 | `SharedExpenseRow` | 固定顯示的垃圾桶圖示按鈕 |
| `/accounts` 轉帳紀錄 | `TransferHistory` | 固定顯示的垃圾桶圖示按鈕 |

## 處理內容

把 `TodayTransactionRow` 原本手刻的右滑手勢邏輯抽成共用元件 `src/components/transactions/swipe-to-delete.tsx`（`SwipeToDelete`）：接收一組 `actions`（icon+label+onClick+顏色）、可選的 `onTap`（點擊未展開時觸發，通常用來開編輯視窗）、可選的 `onLongPress`。

套用到全部 5 個地方：
- `TodayTransactionRow`：改用共用元件，行為不變（右滑露出「複製」「刪除」，長按開快速換分類）
- `TransactionsList` 的 `RegularRow`：改成右滑刪除，點擊維持開編輯視窗（編輯視窗裡本來就有的刪除按鈕保留，多一個入口不衝突）
- `TransactionsList` 的 `TransferRow`：拿掉固定顯示的垃圾桶按鈕，改右滑刪除
- `SharedExpenseRow`：拿掉固定顯示的垃圾桶按鈕，改右滑刪除；已結清的項目維持不能刪除（`actions` 傳空陣列 + `disabled`），「結清」按鈕維持原地不變，另外補上 `onPointerDown` 阻止事件冒泡到滑動手勢，避免點「結清」誤觸發右滑的點擊判定
- `TransferHistory`（`/accounts` 頁的轉帳紀錄）：拿掉固定顯示的垃圾桶按鈕，改右滑刪除

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
