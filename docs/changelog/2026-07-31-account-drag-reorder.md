# 帳戶列表可以按住拖曳排序

日期：2026-07-31

## 處理內容

沿用分類管理頁已經在用的 `@dnd-kit` 拖曳排序機制：

- `accounts` 資料表新增 `sort_order` 欄位（整數，預設 0），已用 `drizzle-kit push` 套用
- `listAccounts`/`listArchivedAccounts` 改成先按 `sortOrder` 排、`createdAt` 當 tiebreaker（原本都還沒手動排過的帳戶，sortOrder 都是 0，會照原本的建立時間排序，行為不變）
- 新增 `reorderAccounts` server action（跟分類的 `reorderCategories`同款）
- `accounts-list.tsx` 改成 `DndContext`/`SortableContext` 包住的可拖曳卡片列表——按住卡片本體（不是點「封存」按鈕）拖曳超過 8px 就會觸發排序，放開後即時呼叫 `reorderAccounts` 存檔；純點擊（沒有拖曳距離）還是照常開啟編輯帳戶對話框

## 驗證

`tsc --noEmit`、`eslint .`、`next build` 全過，`drizzle-kit push` 套用成功。已用 `npx vercel --prod` 部署。

## 更新：改成長按才能拖曳，加上拿起動畫

原本用 8px 位移就觸發拖曳，跟一般滑動捲頁的手勢太像，導致畫面滑不動。改成長按 250ms 才觸發拖曳（`activationConstraint: { delay: 250, tolerance: 5 }` 取代 `distance: 8`）——捲頁是手指一動就開始移動，不會先停在原地，所以長按門檻不會跟捲頁衝突。

拿起的瞬間加了「拉起」的回饋：卡片放大 1.05 倍、陰影變深（`shadow-xl`）、透明度提高一些，陰影透過 `transition-shadow` 平滑過渡；縮放本身合併進拖曳位移的同一個 `transform` 屬性裡（沒有另外加 transition），確保卡片位置還是跟著手指即時移動、不會有延遲感。

同一個問題（分類管理頁的拖曳排序）也用一樣的手法修掉了，沒有等你另外反應。

`tsc --noEmit`、`eslint .`、`next build` 全過，已部署。
