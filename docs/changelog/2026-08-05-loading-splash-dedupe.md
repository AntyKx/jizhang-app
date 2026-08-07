# 拿掉 loading.tsx 舊的滿版小熊圖，解決「兩張開場圖」問題

日期：2026-08-05

## 背景

使用者之前反應過首頁偶爾會連續出現兩張開場圖，當時（2026-08-04）診斷成 `BearSplashScreen` 自己重複掛載，用 `sessionStorage` 擋掉了同一個 tab 內重播兩次的狀況。這次使用者自己提出另一個猜測：會不會是最早那張 loading 圖片沒拿掉，跟後來新增的 10 張隨機開場圖疊在一起才造成的？

查了程式碼確認使用者猜對了，而且是現在仍然存在、跟先前那個 hydration 問題完全不同的另一個原因：

- `src/app/loading.tsx`（Next.js 真正的 Suspense fallback，會顯示到實際資料載入完成為止）自己還在用最早那張滿版小熊圖 `bear-loading-splash.webp`（帶「小熊記帳」字樣）
- `BearSplashScreen`（掛在 root layout，跟 Suspense 完全無關，固定播 ~2 秒的儀式感動畫，用另外 10 張隨機情境圖）
- 這兩個機制是同時掛載的：冷啟動時 `BearSplashScreen` 蓋在最上面播完固定的 2 秒後自動淡出，如果這時候真正的資料還沒載入完成（例如 serverless 冷啟動、網路慢），底下 `loading.tsx` 自己的滿版小熊圖就會露出來——使用者看到的就是兩張不同的全螢幕小熊+字樣圖片先後出現

## 處理內容

`src/app/loading.tsx` 拿掉滿版小熊圖跟呼吸動畫，改成小圖示（`BearIllustration name="welcome"`）+ 文字 + 進度條的極簡版本，保留原本「載入超過 3 秒/10 秒變更提示文字、10 秒後顯示重新整理按鈕」的邏輯完全不變。這樣「已載入完成前」跟「開場儀式播完後」不會再各自顯示一張滿版小熊圖疊在一起，只有 `BearSplashScreen` 是唯一的滿版開場畫面。

順手清掉沒人用到的東西：`public/images/bears/bear-loading-splash.webp`（不再被引用）、`globals.css` 裡的 `splash-bear-breathe` keyframe（只被剛拿掉的呼吸動畫用到）。

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
