# 主畫面長按捷徑（App Shortcuts）

日期：2026-07-30

## 背景

問過桌面 widget 能不能做——iOS/Android 的 widget 都是原生系統功能，PWA 做不到，得真的寫原生 Widget Extension 才行。退而求其次，PWA 範圍內可以做的是 Web App Manifest 的 `shortcuts`：長按主畫面圖示跳出捷徑，直接連到 App 內特定畫面，省掉「開 App→導覽到記帳頁→再點一次」的步驟。

## 處理內容

- `src/app/manifest.ts` 加了 `shortcuts`：「快速記帳」連到 `/record?action=quickadd`、「拍照記帳」連到 `/record?action=scan`。
- `record-screen.tsx` 讀網址上的 `action` 參數，`quickadd` 直接開啟一句話快速記帳的輸入 sheet、`scan` 直接開啟拍照掃收據的 sheet——用 `useState` 的 lazy initializer 從 `searchParams` 帶初始值，不是用 `useEffect` 裡呼叫 `setState`（這個專案的 eslint 規則有擋 `react-hooks/set-state-in-effect`，效果一樣但避免多一次無謂的 re-render）。

## 限制（重要）

**這個功能只有 Android 有，iOS 目前不支援。** Web App Manifest 的 `shortcuts` 是 Chrome/Android 上「加到主畫面」的 PWA（WebAPK）才有實作的功能；iOS Safari 的「加入主畫面」網頁 App 完全沒有實作這個 manifest 欄位，長按 iOS 主畫面圖示不會有任何捷徑選單跳出來——這不是還沒測、是 Apple 目前就是沒開放這個功能給網頁 App。如果主要是用 iPhone 測試，這個功能不會看到效果，屬於平台本身的限制，不是程式碼問題。

## 驗證

`tsc --noEmit`、`eslint .`、`next build` 全過。已部署。Android 上要先確認手機已經「加到主畫面」（重新加一次讓 manifest 更新生效），再長按圖示測試捷徑選單。
