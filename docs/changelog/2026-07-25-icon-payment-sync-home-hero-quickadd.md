# PWA 圖示更換、付款方式連動帳戶、首頁 Hero 合併、AI 快速記帳入口強化

日期：2026-07-25

本次為同一天完成的四項獨立改動，皆已部署到 Production：https://jizhang-app-sand.vercel.app（`npx vercel --prod`，非 git 自動部署）。

---

## 一、PWA 圖示更換

用使用者提供的小熊記帳本圖片（`D:\CLAUDE專案\image.jpg`）取代原本用 `sharp` 現場產生的 SVG 圖示，重新輸出四個尺寸：

- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `public/icons/apple-touch-icon.png`（180×180）

用 `sharp` 的 `resize(size, size, { fit: "cover" })` 直接裁切輸出，`src/app/layout.tsx` 的 `metadata.icons` 路徑本來就指向這幾個檔名，不用改程式碼。原圖背景是柔和的米白漸層、無透明通道，直接當 maskable icon 用也不會露出穿幫的透明角。

---

## 二、付款方式（paymentMethod）與帳戶（account）連動

### 背景

資料庫裡 `transactions.paymentMethod`（現金/信用卡/金融卡/行動支付/自動扣款/其他）與 `accounts.type`（現金/銀行/信用卡/電子錢包/投資）是兩個完全獨立的欄位，記帳畫面要分別選兩次，可能選出「帳戶＝銀行帳戶＋付款方式＝信用卡」這種互相矛盾的組合。討論後決定：**帳戶為主，選帳戶時自動帶出對應付款方式，使用者仍可手動覆蓋**（保留 `stats/categories` 頁既有的付款方式圓餅圖，不砍欄位）。

### 內容

- `src/lib/account-type.ts` 新增 `accountTypeToPaymentMethod` 對照表：`cash→cash`、`bank→debit_card`、`credit_card→credit_card`、`e_wallet→mobile_payment`、`investment→other`。
- `record-screen.tsx`：新增 `selectAccount()`，點帳戶 chip 時同時設定 `accountId` 與對應 `paymentMethod`；初始值與 `reset()`（存完一筆後）也改成依「目前選中的帳戶類型」帶出付款方式，不再寫死 `"cash"`。
- `text-quick-add.tsx`：手動切換帳戶 chip 時同步更新 `draft.paymentMethod`。AI 解析出的初始猜測維持不變、不強制覆蓋，因為文字本身可能已經明講付款方式（例如「刷信用卡」），比帳戶類型推論更準。

---

## 三、首頁標題與摘要區合併成 Hero 卡

### 背景

原本 `/record` 頁面上方同時有全域 Header「記帳本 🐣」＋頁面標題「記一筆帳 📝」＋摘要卡（早安、日期、本日支出），三層資訊重複，視覺上偏向網頁表單。

### 內容

- 新增 `src/components/app-header.tsx`（client component，用 `usePathname()` 判斷），只在非 `/record` 頁面渲染原本的全域 Header；`/record` 頁不再重複顯示。`src/app/(app)/layout.tsx` 改用這個元件取代原本內聯的 `<header>`。
- `src/components/record/home-summary.tsx` 整個重寫成一張 Hero 卡：問候語＋使用者名字（`greeting，{userName} 🐣`）、日期（`M月d日・EEEE`）、今日支出大字（`NT$ x,xxx`）、本月已使用／預算剩餘＋進度條＋百分比，右上角放 Clerk `<UserButton />`（原本在全域 Header 上的頭像移過來）。
- `record/page.tsx` 用 `currentUser()`（`@clerk/nextjs/server`）取 `firstName`（沒有就退回 `username`）傳入 `RecordScreen` → `HomeSummary`；拿掉原本的 `<h1>記一筆帳 📝</h1>`。
- 圖示分類格上方原本沒有標題，這次加了一行「選擇分類」小標籤，跟後面第四項新增的 AI 輸入區做視覺區隔。

### 範圍決定

Mockup 建議欄位裡的「通知」「月份切換」這次沒做——目前沒有通知系統，月份切換也需要另外改後端查詢邏輯支援跨月資料，兩者都是獨立功能而非單純排版合併，留給之後有需要再開。

---

## 四、AI 快速記帳入口從文字連結改成首頁獨立輸入列

### 背景

AI 一句話記帳原本只是分類格下方一行小字連結「✍️ 用一句話快速記帳（AI 解析）」，容易被忽略，但這其實是產品的特色功能，應該要更顯眼；另外 AI 解析失敗時原本只丟 toast 叫使用者「改用圖示記帳」，等於把已經打好的文字整個丟掉。

### 內容

- 新增 `src/components/record/quick-add-bar.tsx`：首頁摘要卡正下方（比分類格更前面）的獨立輸入列，標籤「✨ 說一句話快速記帳」＋輸入框（placeholder「午餐麥當勞 185 元，刷信用卡」）＋圓形送出按鈕（`lucide-react` 的 `Send`）。提交後呼叫 `onSubmit(text)`，`record-screen.tsx` 收到後把文字存進 `quickText` 並切換到 `TextQuickAdd` 畫面。
- `text-quick-add.tsx` 新增 `initialText` prop：`useEffect` 內用 `setTimeout(..., 0)` 延後呼叫 `handleParse(initialText)`，讓使用者一送出就直接自動觸發 AI 解析，不用進畫面後再按一次「AI 解析」（`setTimeout` 是為了閃避 React 的 `set-state-in-effect` lint 規則——`handleParse` 一開始就同步呼叫 `setParsing(true)`，直接在 effect body 內呼叫會被 eslint 擋下，包一層 macrotask 就不算「effect 內同步 setState」）。
- **失敗處理改善**：`handleParse` 的 `catch` 區塊不再只丟 `toast.error`，改成組出一個空白 `draft`（`amount: 0`、`categoryName: null`、`note: 使用者原文`），直接進入手動確認表單，讓使用者能就地補金額、分類、日期等欄位，原輸入文字保留在備註不會遺失。表單內另外加了 `parseFailed` 旗標，畫面上會顯示一行提示「⚠️ AI 沒解析成功，原文已保留在備註，請手動補金額和分類」。「確認記帳」按鈕在金額 ≤ 0 時停用，避免手動流程送出無效資料。

### 待討論（「進一步」清單，尚未實作）

- **付款方式辨識、帳戶辨識**：其實已經做了，`/api/quick-add` 的 prompt 本來就會解析「刷卡/信用卡/行動支付」跟明確提到的帳戶名稱。
- **相對日期**（昨天/前天）：prompt 目前只給「今天日期」，沒有明講要處理相對日期，之後可以直接補強 prompt。
- 以下三項各自是獨立工程量，尚未動工：
  - 語音輸入（需接瀏覽器語音 API，iOS Safari 支援度要留意）
  - 多筆解析（一句話拆成多筆交易，需改 AI 輸出格式為陣列＋改確認畫面 UI）
  - 常用商家記憶／自動學習分類（需要新增資料表記錄商家↔分類對應）
