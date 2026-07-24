# 分類圖示放大與小熊圖示裁切修正

日期：2026-07-24

## 背景

「記一筆帳」頁面（`src/components/record/record-screen.tsx`）的分類選擇網格中，圖示偏小、不夠舒服。且自訂分類使用的小熊圖示（PNG）與內建的 emoji 圖示（如 🍔）在同一容器尺寸下，視覺大小明顯不一致 —— 小熊圖示看起來小了一圈。

## 問題根因

`public/icons/bears/*.png` 原始檔案為 224×224，但實際圖案內容只佔畫布約 87.5% 寬、67% 高，且上方留白遠多於下方（非置中）。`CategoryIcon` 元件用 `object-contain` 依容器等比縮放整張畫布，導致空白也被一併縮放進去，圖案本身自然比 emoji 顯得小。

## 修改內容

1. **容器尺寸放大**（`src/components/record/record-screen.tsx:209`）
   分類網格圖示從 `h-8 w-8 text-3xl`（32px）逐步放大到 `h-20 w-20 text-6xl`（80px）。

2. **小熊圖示素材修正**（`public/icons/bears/*.png`，共 30 張）
   寫腳本以 alpha 邊界（bbox）裁掉透明留白，並置中重新貼到正方形畫布（保留 10px 邊距），讓圖案填滿畫布，視覺份量與 emoji 一致。原始檔案已被覆蓋（git 歷史中保留舊版本）。

3. **回頭修正：只放大圖片圖示，emoji 維持原本大小（已被下一步取代）**
   把小熊圖示放大到 80px 之後，plain emoji（🍔💊🎮🏠📚🔁💸 等，未替換成小熊圖的分類）在同樣大小的容器下顯得笨重、失真。因此在 `category-icon.tsx` 新增 `isImageIcon()` 判斷式，`record-screen.tsx` 依圖示類型分別給 class：
   - 圖片（小熊 PNG／AI 產生圖）：`h-20 w-20`
   - emoji 文字：`h-10 w-10 text-4xl`（40px，維持原本較小、清爽的比例）

   但這樣導致同一個網格列裡，圖片卡片（80px）跟 emoji 卡片（實際字高遠小於 40px）高度對不齊、格子大小七零八落。

4. **真正根因：`<span>` 是 inline 元素，`h-*/w-*` 對它沒作用**
   emoji 用 `<span className="h-10 w-10 text-4xl">`，但 CSS 的 width/height 對 inline 元素不生效，實際撐開高度的只有 `text-4xl` 字級（遠小於 40px），造成圖片與 emoji 圖示在同一格線列中高度不一致，卡片對不齊。
   修正：`category-icon.tsx` 的 emoji `<span>` 改成 `inline-flex items-center justify-center`，讓 `h-*/w-*` 真正生效並置中；`record-screen.tsx` 圖片與 emoji 圖示改回共用同一組尺寸 `h-16 w-16 text-3xl`（64px 容器），不再依類型分開設定，格線列高度自然一致。

5. **收尾：縮小卡片留白，文字貼近圖示**
   `record-screen.tsx` 分類按鈕的 `gap-1.5 p-3` 改為 `gap-0.5 p-2`，圖示與文字間距、卡片內距都縮小，格子整體變小、更緊湊。

**最終定案（2026-07-24，使用者確認滿意，之後除非使用者主動要求，不再調整）：**
- 圖示容器：`h-16 w-16 text-3xl`（圖片、emoji 共用）
- 按鈕：`flex flex-col items-center gap-0.5 rounded-2xl border bg-card p-2 ...`

## 其他

- 已將「一律用中文回覆」設為跨專案的全域偏好，存入記憶系統。
- 已部署到 Vercel Production：https://jizhang-app-sand.vercel.app
  （專案 `jizhang-app`，透過 `npx vercel --prod` 部署，非 GitHub 自動部署，因為尚未設定 git remote 且本地端還沒有任何 commit。）

## 待辦 / 提醒

- 本地端這個 repo 目前**尚未有任何 git commit**，所有檔案仍是 untracked。若要讓部署可追溯、可回滾，建議之後補上 commit。
