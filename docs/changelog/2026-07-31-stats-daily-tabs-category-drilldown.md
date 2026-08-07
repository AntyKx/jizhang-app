# /stats/daily 分頁籤化 + 分類下鑽

日期：2026-07-31

## 背景

`/stats/daily` 原本是 5 張全寬 Card 垂直疊在一起（收支趨勢、支出分類、每日消費熱力圖、週間消費模式、付款方式），使用者要一路往下滑才看得完，討論後覺得不夠專業。用 `/design-preview/stats-layout`（已刪除）做了兩個方案的預覽比較：A 橫向滑動輪播、B 頁內分頁籤，兩者都搭配「點分類看細節」的下鑽功能。最後選 **方案 B（分頁籤）**——跟 App 其他地方（`StatsTabNav`、`StatsRangeSwitcher`）已經在用的分頁籤視覺一致，比引入新的滑動手勢更容易被發現。

## 處理內容

### 分類下鑽
- `getCategoryDrilldowns(userId, range)`（`src/lib/stats/category-queries.ts`）：把 `getCategoryBreakdown` 已經查過的同一批支出交易，改成依「分類＋商家/備註」分組，取每個分類前 4 大商家，一次算好存進 `Record<categoryKey, {merchant, amount}[]>`，展開某個分類時不用再多打一次 API。
- `CategoryDrilldownList`（`src/components/stats/category-drilldown-list.tsx`）：沿用舊版 `CategoryBreakdown` 的清單+收合外觀，但每一列可以點擊展開，顯示這個分類的前幾大商家明細。
- `CategoryBreakdownPanel` 新增可選的 `drilldowns` prop：有傳就用 `CategoryDrilldownList`，沒傳（付款方式那組）就維持原本的純清單 `CategoryBreakdown`——同一個元件服務兩種情境，不用重複寫 Donut+清單的排版。

### 次要圖表分頁籤化
- `SecondaryChartsTabs`（`src/components/stats/secondary-charts-tabs.tsx`）：把「每日消費熱力圖」「週間消費模式」「付款方式」三張獨立 Card 合併成一張 Card + 一組頁內分頁籤，一次只顯示一個內容，點擊切換。
- `/stats/daily` 現在只剩 3 個區塊：收支趨勢（全寬）、支出分類（含下鑽）、次要圖表分頁籤——比原本 5 張疊卡片明顯短。

`/stats/advanced` 的 5 張圖表（淨資產趨勢、金流圖、累積支出、月對月比較、分類佔比趨勢）都是各自獨立的深度內容，這次沒有動——之後如果也要處理，需要另外討論怎麼分組。

## 修正：切換分頁籤後下半部被擋住

三個分頁內容高度差很多（週間模式長條圖約 224px，付款方式的圓餅圖+清單常常超過 500px），使用者滑到這個區塊後，切到內容比較高的分頁，下半部會超出畫面，得自己再往下滑一次才看得到。

**第一次修法**（`scrollIntoView({ block: "nearest" })` 捲動內容區塊）不夠——使用者回報「還是沒顯示完全」。原因是 `nearest` 沒辦法讓一個超過 500px 的元素完整塞進比它矮的螢幕範圍，數學上不可能。

**第二次修法**（實際上線版本）雙管齊下：(1) 付款方式分頁拿掉圓餅圖（改用純清單 `CategoryBreakdown`），少了約 224px，三個分頁的高度就落在差不多的範圍；(2) 捲動目標改成整張 Card（含分頁籤按鈕）而不是內容區塊，並改用 `block: "start"`——切換分頁時整張卡片捲到畫面最上方，落點固定可預期，剩下超出畫面的部分再讓使用者用正常方式往下滑，不強求「一定要整個塞進畫面」。

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。design-preview 的暫時檔案（`stats-carousel-section.tsx`、`stats-layout-preview-switcher.tsx`、`stats-layout` 頁面）都已刪除。
