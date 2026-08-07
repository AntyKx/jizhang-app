# 修正開場動畫變成「先看到首頁才出現」的問題

日期：2026-08-05

## 背景

使用者反應登入後進首頁的順序顛倒了：現在會先看到首頁內容，過一下子開場小熊動畫才跳出來蓋上去，跟原本設計的「一進來就先看到動畫」相反。

## 根本原因

這是 2026-08-04 為了修「同一個 tab 偶爾連續播兩次」而加的 `sessionStorage` 判斷（`claimSplashTurn()`）造成的副作用，當時沒有想到會影響首次播放的順序：

- `claimSplashTurn()` 內部 `typeof window === "undefined"` 時直接回傳 `false`（伺服器端渲染時一定是這樣，`sessionStorage` 在 SSR 階段本來就不存在）。
- 原本的 `shouldPlay` 狀態是用 `useState(() => !isAuthPage && (forceFile !== undefined || claimSplashTurn()))` 算出來的——這代表**伺服器端永遠算出「不播放」**，畫面先送出「沒有動畫」的 HTML。
- 瀏覽器 hydrate 時重新執行同一段邏輯，這次 `window` 存在了，如果是這個 tab 第一次載入，`claimSplashTurn()` 會回傳 `true`——跟伺服器端算出的結果不一樣，觸發 React 的 hydration mismatch，React 只好在 hydrate 完成後才把動畫畫面「補」上去，也就是使用者看到的「首頁先出現，動畫慢半拍才蓋上來」。

## 處理內容

`src/components/bear-splash-screen.tsx`：把「要不要顯示動畫這個元素」跟「要不要真的播放動畫」拆開：

- 是否要渲染動畫的 DOM（`shouldRender`）現在只看 `pathname`（是否在 /sign-in、/sign-up），這個值在伺服器端跟前端第一次渲染時保證一致，所以第一畫面就會正確顯示動畫，不會有 hydration mismatch
- `sessionStorage` 的「這個 tab 是否已經播過」判斷搬到 `useEffect` 裡（掛載後才執行，只在瀏覽器端跑）——如果已經播過，直接把 phase 設成 `"gone"`（透過 `requestAnimationFrame` 延後呼叫，避免在 effect 裡直接同步 setState 觸發連鎖重render 的 eslint 規則），略過整套進場/停留/退場動畫，最多閃一格畫面，不會像之前那樣完整重播一次 ~2 秒的動畫

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
