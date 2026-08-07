# 統計頁圖表改版、GSAP 動態效果、PWA 支援

日期：2026-07-24

本次包含三項獨立但同一天完成的大改動：統計頁全面加入圖表、全站加入 GSAP 動態效果、加入 PWA 支援。三項都已部署到 Production：https://jizhang-app-sand.vercel.app（`npx vercel --prod`，非 git 自動部署）。

---

## 一、統計頁圖表改版

### 背景

原本的「統計」頁面只能看「本月」單一時間範圍，分類/付款方式明細是手刻的橫向長條列表，沒有真正的圖表元件，也沒有跨月趨勢視角。

### 新架構

拆成 4 個分頁（路由，非 client tab）：

| 路由 | 內容 |
|---|---|
| `/stats` 總覽 | 收入/支出/連續天數卡、收支趨勢折線圖、累積支出曲線、AI 摘要、異常提醒 |
| `/stats/categories` 分類 | 分類圓餅圖＋排名列表、付款方式圓餅圖＋列表、分類佔比堆疊面積圖（近6個月） |
| `/stats/trends` 趨勢 | 每日消費熱力圖（近12個月）、月對月比較柱狀圖、週間消費模式 |
| `/stats/budgets-goals` 預算與目標 | 整體預算 vs 實際柱狀圖（近6個月）、本期預算進度條、儲蓄目標進度條 |

共用的週/月/年時間範圍切換器（`src/lib/stats/range.ts` + `src/components/stats/stats-range-switcher.tsx`），沿用 `calendar/page.tsx` 既有的「純 Link + searchParams」導覽模式（無 client state）。

新增圖表庫 `recharts`（透過 `npx shadcn@latest add chart` 安裝，含 `src/components/ui/chart.tsx` 封裝）。資料層拆成 4 個模組，對應 4 個分頁：`src/lib/stats/{overview,category,trend,budget-goal}-queries.ts`。

色彩策略統一在 `src/components/stats/chart-colors.ts`：分類圖表沿用既有的 `pickCategoryColor`/`paymentMethodColor` 色盤（不再用舊的 `#6366f1` fallback），收支語意色固定用 `emerald-600`/`--destructive`，刻意不使用 shadcn 內建但全站沒用過的 `--chart-1..5` CSS 變數。

### 踩到的坑（recharts v3 + Next.js SSR）

1. **`<Pie>` 在 SSR 下完全不渲染扇形（zero sectors，不報錯）**。原因：`isAnimationActive` 預設 `"auto"`，在這個 Next.js SSR/hydration 環境下動畫會卡在「尚未開始」的空狀態，永遠不恢復。**修法：所有 recharts 圖形元件（`Line`/`Area`/`Bar`/`Pie`）一律加上 `isAnimationActive={false}`。**
2. **堆疊 `<AreaChart>` 的某個月份如果某分類完全沒有支出，該月的資料物件會缺少對應 key（`undefined` 而非 `0`），導致整條 Area 的路徑坍縮成一個點**。修法：`category-queries.ts` 的 `getCategoryShareTrend` 改成每個 bucket 都先用 `Object.fromEntries(series.map(s => [s.id, 0]))` 補零，再疊加實際金額。

### 已知資料限制（非 bug）

- 月對月 YoY 比較：帳號使用不到 13 個月時「去年同期」會是空值（優雅隱藏，不是 0）。
- 預算 vs 實際：只有使用者手動設定過的月份才有資料，沒有自動延續上月設定。

---

## 二、GSAP 動態效果

### 背景

使用者反饋整個 app「AI 生成感」太重——清單靜態出現、切換無轉場、數字直接印出。加入 `gsap` + `@gsap/react`（`useGSAP` hook），集中包成幾個可重用元件套用到全站：

- `src/components/motion/stagger-list.tsx`：清單/卡片進場時依序淡入上移（自動依項目數量調整間隔，避免長列表如 200 筆交易要跑 9 秒才跑完）
- `src/components/motion/count-up-number.tsx`：數字從舊值滾動到新值
- `src/components/motion/sliding-indicator.tsx`：分頁/切換按鈕背後會滑動的高亮背景（main-nav 底部導覽、record 頁支出/收入切換、stats 分頁與週/月/年切換）
- `src/components/motion/reveal.tsx`：單一區塊淡入（record 頁三個檢視切換時用）

套用範圍：`main-nav.tsx`、`record-screen.tsx`（分類格 stagger + 按鈕按下回彈 + 三個檢視的淡入過場）、`stats` 4 個分頁的卡片、`budgets`/`goals`/`subscriptions`/`transactions` 頁的清單與標題數字。交易列表金額刻意不做數字滾動（項目太多，反而更像罐頭 demo）。

### 踩到的坑（GSAP + React 19 + Next.js SSR，皆不報錯的靜默 bug）

1. **`useGSAP` 搭配 `dependencies` 陣列，每次依賴變化都會把動畫復原（revert）回動畫前的狀態**，而不是保留套用結果。凡是「動畫結果需要跨渲染持續存在、依賴變化只是重新定位」的情境（滑動指示器換位置、數字滾動到新值），都**不能**用 `useGSAP(fn, { dependencies: [...] })`，要改用純 `useEffect`/`useLayoutEffect` 直接呼叫 `gsap.to()`/`gsap.set()`。`useGSAP`（不帶 dependencies，只在 mount 執行一次）則沒問題，`StaggerList`/`Reveal` 繼續用它即可。
2. **`useLayoutEffect` 在第一次 hydration mount 時，讀不到父層傳入的 ref（`containerRef.current` 為 null 或抓不到目標元素），但之後任何一次 client 端重新渲染都正常運作**。症狀：滑動指示器第一次載入時完全看不到（`opacity:0`、寬高 0），但只要點一下切換就立刻正常。修法：改用 `useEffect`（保證在 hydration 完全結束、瀏覽器 paint 之後才執行）取代 `useLayoutEffect`。

### 除錯小筆記

`claude-in-chrome` 的 `read_console_messages` 工具只會從「第一次被呼叫」那一刻開始收集 console 訊息——如果頁面在呼叫這個工具之前就已經載入完成，之前的 log 會被完全漏掉，需要先呼叫一次工具、再重新整理頁面才能抓到完整的 console 輸出。

---

## 三、PWA 支援

### 背景

參考另一個專案「旅遊規劃」（`trip-planner`）的做法：**刻意不使用 Service Worker、不裝任何 PWA 套件**（`next-pwa`/`serwist`/Workbox 都沒用）。旅遊規劃專案先前試過 Service Worker，後來拿掉——攔截每次導覽會拖慢速度，快取動態、per-user 的 HTML 在網路不穩時容易顯示過期或權限錯誤的畫面，得不償失。

### 加入的內容

- `src/app/manifest.ts`：Next.js App Router 原生 manifest 慣例，自動產生 `/manifest.webmanifest` 並自動注入 `<link rel="manifest">`。
- `public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png`：用 Node + `sharp` 現場產生的帳本造型圖示（純 SVG 圖形拼出來，沒有用 emoji/文字，避免不同環境字型渲染不一致的風險），配色沿用 app 主色（暖橘 `#e2874f`）。
- `src/app/layout.tsx`：加上 `metadata.icons`、`metadata.appleWebApp`（capable/statusBarStyle/title）、`viewport`（`themeColor`、`viewportFit: "cover"` 讓瀏海安全區 `env(safe-area-inset-*)` 生效）。
- 4 個支援元件（皆參考旅遊規劃專案原樣移植，文案改成記帳本用語）：
  - `src/components/update-checker.tsx`：每 5 分鐘 + 分頁重新可見時輪詢 `/api/version`，比對建置時就寫死的 `NEXT_PUBLIC_BUILD_ID`，偵測到新版本且使用者沒有正在輸入時自動重新整理。
  - `src/components/install-prompt.tsx`：只在 iOS Safari 顯示的靜態提示（「點分享鍵 → 加入主畫面」）。`beforeinstallprompt` 在 iOS 上不會觸發，所以沒有 Android/Chrome 的原生安裝提示邏輯。
  - `src/components/version-badge.tsx`：畫面角落顯示 `v{buildId}`，方便肉眼確認部署有沒有上線。
  - `src/components/service-worker-cleanup.tsx`：安全網，若之後不小心裝了 Service Worker 又移除，負責主動 unregister（單純刪掉檔案對已安裝的瀏覽器沒有用）。
- `next.config.ts`：新增 `buildStamp()`，每次 `next build` 把 `YYYYMMDD-HHmmss` 寫進 `NEXT_PUBLIC_BUILD_ID`。
- `src/app/api/version/route.ts`：回傳 `{ buildId }`，`force-dynamic` + `no-store`。

### 踩到的坑

`/api/version` 一開始被 Clerk 的 middleware（`src/proxy.ts`）擋下回傳 404——因為它的 matcher 涵蓋所有 `/api/*` 路由並呼叫 `auth.protect()`，而這支 API 沒有登入態也該能查。修法：把 `"/api/version"` 加進 `isPublicRoute` 白名單（跟 `/sign-in(.*)`、`/sign-up(.*)` 並列）。**之後任何新增的「不需要登入」API 路由都要記得補進這個白名單**，否則 Clerk 對被擋下的 API 路由會直接回 404（不是導向登入頁），debug 時很容易誤以為是路由本身不存在。

---

## 其他

- 三項功能的技術細節與踩坑經驗，都已個別存進 memory 系統（`project_jizhang_stats_charts`、`project_jizhang_gsap_animations`、`project_jizhang_pwa`），供之後的對話直接查閱。
- 本地端這個 repo 目前只有一個「Initial commit」，沒有設定 git remote，部署仍是透過 `npx vercel --prod` 直接從工作目錄部署，不是 GitHub 自動部署。
