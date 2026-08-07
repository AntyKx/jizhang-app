# PWA 圖示換成小熊記帳員插圖

日期：2026-07-29

## 背景

使用者提供一張 1254×1254 的小熊插圖（拿著錢幣跟記帳本，暖黃色漸層圓角方形背景），要求換成 PWA/App 圖示。

## 處理內容

用 Python/Pillow 從來源圖產生全部圖示規格：
- `public/icons/icon-192.png`（192×192）、`icon-512.png`（512×512）、`apple-touch-icon.png`（180×180）：直接等比縮放，來源圖本身已經是滿版圓角方形設計。
- `public/icons/icon-maskable-512.png`：來源圖直接縮小置中會在中間露出一圈原本圖片自帶的圓角黑邊（圖片本身的圓角方形形狀在背景是黑色）。改用 flood fill 從四個角落把黑色圓角裁切區域轉透明，再縮到 400×400 貼到用取樣自圖片漸層色（`rgb(247,186,74)`）填滿的 512×512 畫布置中，符合 maskable icon 安全區（重要內容需落在中心 ~80% 直徑圓內）規範，邊緣過渡平滑不會露黑邊。
- `src/app/favicon.ico`：同來源圖產生 16/24/32/48/64 多尺寸 ico。**踩坑**：第一次用 RGB（無 alpha）存的 ico，Next 16 的 Turbopack build 會直接噴錯「The PNG is not in RGBA format!」——ico 內嵌的 PNG frame 必須是 RGBA，改用 `.convert("RGBA")` 後重存才過。

`manifest.ts`、`layout.tsx` 的 icon 路徑本來就指向這幾個檔名，沒有改程式碼，純換圖檔。

## 驗證

`next build` 過（含 favicon RGBA 那個坑修好後）。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。
