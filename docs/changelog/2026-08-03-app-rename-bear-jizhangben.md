# App 更名為「小熊記帳本」

日期：2026-08-03

## 處理內容

把 PWA 名稱從「記帳本」改成「小熊記帳本」，更新所有顯示 App 名稱的地方：

- `manifest.ts`：`name`／`short_name`（決定手機桌面圖示下方文字、App 切換器顯示名稱）
- `layout.tsx`：`metadata.title`（瀏覽器分頁標題）、`appleWebApp.title`（iOS PWA 標題）
- `error.tsx`／`global-error.tsx`：錯誤畫面上顯示的品牌名稱
- `terms/page.tsx`／`privacy/page.tsx`：頁面 `<title>`、頁首品牌標籤、條款內文「適用於「＿＿」App」
- `install-prompt.tsx`：iOS 加入主畫面的提示文字

沒有動 `loading.tsx` 那張啟動畫面插畫——圖片裡烤進去的是「小熊記帳」（少一個字），是使用者提供的既有圖片素材，不是這次改名的範圍，如果之後也要一起改字，需要換一張新圖或請設計端調整。

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
