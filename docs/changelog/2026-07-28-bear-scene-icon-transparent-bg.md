# 第三批小熊情境插圖背景修正

日期：2026-07-28

## 背景

`public/images/bears/` 裡第三批 10 張小熊情境插圖（`bear-bank-sync`、`bear-categorize`、`bear-coupon-saving`、`bear-export-report`、`bear-invoice`、`bear-monthly-summary`、`bear-multi-account`、`bear-pay-bills`、`bear-savings-challenge`、`bear-secure-login`）產出時帶有實心的暗色暈影背景，跟其他約 50 張透明背景的小熊圖示不一致，在「新增/編輯分類」的「🐻 小熊圖示」選擇器（`src/components/categories/icon-picker.tsx`）裡顯得格格不入。

## 處理過程

1. **嘗試一：演算法去背失敗** — 用 flood-fill 色彩容差（從圖片邊界往內比對相鄰像素色差）去背，因為背景漸層跟熊的毛色太接近，把熊本體也一起吃掉，畫面破碎不可用。
2. **嘗試二：暈影漸層淡化成卡片色（暫時上線過一次）** — 把四角暗色暈影用 smoothstep 漸層混合成站內 `--card` 設計 token 的米白色，效果可接受但仍不是真透明。使用者認為不如直接先移掉這批。
3. **暫時移除**：把這 10 筆從 `src/lib/bear-icons.ts` 拿掉（檔案留在硬碟未刪除），部署上線，選擇器裡先不出現這 10 張。
4. **使用者重新產出透明背景版本**：使用者自行用其他工具重新產生這 10 張情境圖（1024×1024 PNG，存在 `D:\CLAUDE專案\小熊情境圖_第三批_透明背景_10張\`，檔名為中文標籤，如 `06_小熊銀行帳戶同步_透明背景.png`）。
5. **驗證與替換**：用 `sharp` 讀取原始像素做完整 alpha histogram 抽樣（不是只看邊角像素），確認整張背景真的透明、邊緣像素顏色也正常（無殘留暗色描邊/光暈問題）。確認無誤後縮放成 640×640、轉存 `.webp`，覆蓋掉原本暈影版本的檔案，並把 10 筆項目加回 `bear-icons.ts`。

## 踩坑記錄

檢查透明背景時，直接用圖片預覽工具「肉眼看」會誤判——本工具鏈的圖片預覽似乎沒有正確合成 alpha 通道，會把本來透明的區域顯示成殘留的底色（看起來像沒去背成功），實際上像素的 alpha 值是 0（真透明）。之後要判斷一張圖是否真的去背成功，應該用程式讀 raw pixel 的 alpha 數值抽樣檢查，不能只靠預覽畫面的視覺判斷。

## 結果

10 張情境插圖恢復透明背景，重新出現在小熊圖示選擇器中，跟其餘圖示視覺一致。已部署到 Vercel Production：https://jizhang-app-sand.vercel.app （`npx vercel --prod`，非 git 自動部署）。
