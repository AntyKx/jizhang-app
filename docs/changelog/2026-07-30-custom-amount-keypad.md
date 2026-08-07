# 記帳金額改用自訂數字鍵盤

日期：2026-07-30

## 背景

使用者反應系統原生鍵盤的風格跟 App 不搭。PWA 沒辦法整個換掉系統鍵盤（文字輸入、IME 都得留給原生），但「金額」這種純數字欄位可以換成自訂的計算機式鍵盤。先在 `/design-preview`（未連結頁面）做外觀原型，確認手感後接進主要記帳畫面。

## 處理內容

- 新增 `AmountKeypadField`（`src/components/record/amount-keypad-field.tsx`）：0-9／小數點／退格的計算機式鍵盤，樣式跟既有分類按鈕一致（圓角、陰影、按壓回彈動畫），value/onChange 介面跟原本 `<Input type="number">` 相容，之後其他 11 個金額欄位要換也是同一個元件直接替換
- `record-screen.tsx` 的記帳金額欄位換成 `AmountKeypadField`，同時移除了原本專門為了讓 iOS 原生鍵盤跟手勢綁定而寫的 `flushSync` + ref 強制 focus、以及鍵盤彈出時的 viewport resize 捲動補償——這些都是原生數字鍵盤才需要的 workaround，改用自訂鍵盤後不再需要
- 刪除 `design-preview` 原型頁面與 preview 專用元件（`keypad-preview.tsx`），只留下已經正式使用的 `AmountKeypadField`

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。

## 待辦

其餘 11 個金額欄位（轉帳金額/手續費、期初餘額、共同帳本支出、訂閱規則金額、預算上限、目標金額、提撥金額）尚未替換，之後有需要再換上同一個 `AmountKeypadField`。

## 更新：改成下滑收合的浮動鍵盤

原本鍵盤是直接內嵌在表單裡，把整張表單撐得很長。改成跟金額顯示框分開：金額框本身只是個按鈕，點下去才從畫面底部滑出鍵盤面板（`fixed inset-0` + `translate-y-full`/`translate-y-0` 的 transition，跟現有 `BottomSheetContent` 的滑入手法一致），不再佔用表單版面的固定高度。面板上有「完成」按鈕可以收合，跟記帳表單本身的送出按鈕是分開的兩件事。

## 更新：選分類後自動帶出鍵盤

`AmountKeypadField` 加了 `autoOpen` prop，`record-screen.tsx` 選分類進入金額輸入步驟時直接傳入，元件掛載時 `open` 初始值就是 `true`——不用像原生鍵盤那樣靠 `flushSync`+手勢綁定的 focus 才能彈出，純 CSS 面板本來就沒有這個限制，選分類就自動帶出鍵盤，跟以前原生數字鍵盤的體驗一致。

## 更新：其餘 11 個金額欄位全部換上

換完的檔案：`transfer-dialog.tsx`（金額＋手續費）、`create-account-dialog.tsx`（期初餘額）、`subscriptions/create-rule-dialog.tsx`／`edit-rule-dialog.tsx`（金額）、`shared/text-quick-add.tsx`／`add-expense-dialog.tsx`／`edit-expense-dialog.tsx`（金額）、`record/text-quick-add.tsx`／`receipt-scan-quick-add.tsx`／`edit-transaction-dialog.tsx`（金額）、`budgets/create-budget-dialog.tsx`／`edit-budget-dialog.tsx`（預算上限）、`goals/create-goal-dialog.tsx`／`edit-goal-dialog.tsx`／`contribute-form.tsx`（目標金額／提撥金額）。全站數字輸入到此全部換成同一顆 `AmountKeypadField`。

處理上兩個常見情況：

- **AI 解析出來的草稿（`draft.amount: number`）**：原本 `<Input>` 直接綁 `draft.amount` 來回轉型。改成額外維護一個 `amountText` 字串 state 專門給鍵盤用，`draft.amount` 只在 `onChange` 時同步更新——如果直接把 `draft.amount` 轉字串回填給鍵盤，使用者打完小數點（例如「12.」）畫面會因為 `Number("12.")===12` 而立刻把小數點吃掉，體驗很糟。
- **用 `<form action={formData => ...}>` 原生送出、原本靠 `name="amount"` 讀值的表單**：改成受控 state＋一個同名的 `<input type="hidden">` 讓 FormData 照樣拿得到值，伺服器端 action 完全沒動。同時把原本靠 `required` 做的 HTML5 驗證，換成用 `disabled={!amount || Number(amount) <= 0}` 擋送出按鈕。
- 目標存入表單（`contribute-form.tsx`）給了 `AmountKeypadField` 一個 `className` 覆寫，縮小成跟旁邊「存入」按鈕同高的樣式（元件新增了可選的 `className` prop，用 `cn`/`twMerge` 蓋掉預設的 `h-16`/`text-3xl`）。

`tsc --noEmit`、`eslint .`、`next build` 全過，已用 `npx vercel --prod` 部署。
