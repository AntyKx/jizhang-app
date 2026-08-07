# 全站數字對齊、色彩飽和度與卡片陰影升級

日期：2026-07-29

## 背景

延續「排版與間距一致性」「整體視覺再升級」的討論。先做了客觀可驗證的部分（數字對齊），再用一個未連結的 `/design-preview` 比較頁讓使用者在真實情境（首頁摘要卡、統計總覽卡、交易列表）裡比較色彩/陰影/字級選項，避免憑空猜測後大範圍重寫整站樣式。第一輪「選項 A/B」使用者都不喜歡，原因是金額字級被放大加粗（`text-3xl/4xl font-bold`）；拿掉字級改動、只留色彩與陰影的版本後，選了選項 A。

## 處理內容

1. **`tabular-nums` 全站補齊**：原本只有 6 個檔案的金額顯示用等寬數字，其餘約 20 處（交易列表、首頁今日支出/本月剩餘、帳戶餘額、共同帳結算、訂閱金額、統計總覽卡片、異常提醒等）都補上，直排的金額欄位不會再因為數字寬度不一而歪斜。`src/components/motion/count-up-number.tsx`（跑動畫數字的共用元件）直接把 `tabular-nums` 做進元件預設樣式，一次覆蓋 7 個使用它的地方（含未來新用法）。

2. **`src/app/globals.css` 色彩 token 更新**（選項 A，字級/字重不變）：
   - 亮色模式：`--primary` oklch(0.72 0.16 40) → oklch(0.68 0.19 38)（更深更飽和的橘）；`--accent` oklch(0.9 0.07 165) → oklch(0.8 0.11 165)（從很淺的薄荷變成有存在感的青綠）；`--foreground` oklch(0.32 0.03 40) → oklch(0.26 0.035 42)（文字對比略提高）。`--ring`、`--card-foreground`、`--popover-foreground`、`--sidebar-*` 等衍生 token 同步更新。
   - 暗色模式：對應做了保守的同向調整（只加飽和度、不動明度，避免影響暗色背景下的可讀性）：`--primary` oklch(0.74 0.15 40) → oklch(0.74 0.18 40)；`--accent` oklch(0.4 0.06 165) → oklch(0.42 0.1 165)。使用者只在亮色模式看過比較頁，暗色是依同一方向類推，之後如果覺得不對可以再單獨調。

3. **卡片陰影加深一階**：`src/components/ui/card.tsx`（`<Card>` 共用元件）跟其餘 17 個直接手刻卡片樣式（未使用 `<Card>` 的空狀態/摘要卡，例如 `home-summary.tsx`、`net-worth-summary.tsx`、各頁面的空狀態卡）全部從 `shadow-sm shadow-foreground/5` 統一改成 `shadow-md shadow-foreground/10`，維持全站一致。

4. **刪除 `/design-preview`**：決定完成後這個比較頁已經沒有用途，直接刪除，不留在程式碼裡。

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。
