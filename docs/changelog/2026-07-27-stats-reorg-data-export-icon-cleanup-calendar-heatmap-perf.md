# 統計重組、資料匯出、全站 icon 清理、行事曆熱力圖、導覽效能

日期：2026-07-27

這次是累積一整天的改動，主軸圍繞著「風格一致性」跟「使用體感」——從統計頁重新分層、補齊資料匯出/備份、清掉全站殘留 emoji、行事曆從唯讀變可編輯再加上熱力圖，最後抓出導覽切換延遲的根本原因並修掉。全部已部署到 Production：https://jizhang-app-sand.vercel.app（`npx vercel --prod`，非 git 自動部署）。

---

## 一、Bottom Sheet 金額輸入的鍵盤與捲動 bug

首頁記帳流程的金額輸入 Sheet 有兩個手機才會出現的 bug：打開時畫面會直接跳到底部看不到上面（原因是 `object-cover`/`autoFocus` 搭配 Sheet 滑入動畫，瀏覽器在元素還在畫面外時就觸發了 scroll-into-view）；後續嘗試修正的過程中又發現數字鍵盤完全不跳出來。

最終根本原因追到 `@base-ui/react` 的 `FloatingFocusManager`：它自己有一個 `useIsoLayoutEffect` + `queueMicrotask` 排的「初始焦點」邏輯，預設會把焦點導向彈窗容器本身（不是我們手動 focus 的輸入框），而且它內部呼叫 focus 用的 `enqueueFocus` 永遠透過 `requestAnimationFrame` 延遲一幀（除非傳 `sync: true`，函式庫沒傳）。這解釋了為什麼不管怎麼調整我們自己 focus 呼叫的時機都沒用——問題不是時機，是函式庫本身的機制會在我們之後又把焦點搶走。

最終解法（兩者缺一不可）：
- `<BottomSheetContent initialFocus={amountInputRef}>` 讓函式庫自己那個「慢半拍」的 refocus 導向正確的輸入框，不再搶走焦點
- `openCategory` 用 `flushSync` 讓輸入框 DOM 同步存在，緊接著同步呼叫 `amountInputRef.current?.focus({ preventScroll: true })`——這一步才是真正跟使用者手勢同步、能實際彈出鍵盤的呼叫

---

## 二、統計頁重新分層

原本「總覽」分頁塞了 3 張數字卡＋淨資產趨勢＋Sankey＋收支趨勢＋累積支出＋AI 摘要＋異常提醒，圖表沒有視覺層級之分。改成三層：

- **總覽**（`/stats`）：只留數字——收入/支出/結餘/連續天數（4 卡）＋新增「最大支出分類」「支出與上期比較」（2 卡，新增 `getPreviousPeriodTotals` query）＋AI 本月摘要＋異常提醒，完全沒有圖表
- **日常分析**（新路由 `/stats/daily`，取代原本「分類」「趨勢」兩個分頁）：收支趨勢、支出分類、每日消費熱力圖、週間消費模式、付款方式
- **進階分析**（新路由 `/stats/advanced`）：淨資產趨勢、現金流 Sankey、累積支出、月對月比較、分類佔比趨勢（6個月）
- **預算與目標**：不變

原本的 `/stats/categories`、`/stats/trends` 路由直接刪除（沒有轉址）。

---

## 三、資料與備份頁面

用戶指出「更多」頁裡的 `bear-export-report.webp`、`bear-cloud-backup.webp` 兩張熊圖沒有對應功能入口（後來確認這兩張只是 60 張情境熊圖批次生成裡剛好搭到主題的圖，不是預留功能），順勢補上一個正式記帳 App 該有的資料可攜性功能：

- **匯出 CSV／Excel**：全部交易明細（不限日期範圍），Excel 版用新增的 `exceljs` 套件產生
- **匯出月報**：Excel 三個分頁（本月摘要、支出分類、收入分類）
- **雲端同步狀態**：如實說明「這個 App 沒有離線儲存，每筆記帳直接寫進雲端 Postgres」，並顯示交易筆數/帳戶數/最早紀錄日期
- **刪除全部資料**：需輸入「刪除所有資料」四字才能確認，依外鍵順序刪除（`neon-http` driver 不支援 transaction，所以是依序執行）

新增 `exceljs` 依賴，`npm audit` 會顯示中高風險（透過 archiver/uuid），但都是要「攻擊者能控制 glob 樣式」或「呼叫 uuid 時手動傳自訂 buffer」才會觸發，專案用法沒有踩到，已告知風險。

---

## 四、全站 emoji 圖示清理

延續「系統圖示一律用 Lucide 線條圖，emoji 只留給小熊插畫」的規則，這次補完最後一批殘留：

- 新增 `AccountTypeIcon`（Banknote/Landmark/CreditCard/Smartphone/TrendingUp）與 `PaymentMethodIcon` 兩個共用元件
- 換掉 17 處呼叫點：帳戶列表、封存帳戶列表、轉帳對話框、轉帳紀錄、交易列表（含轉帳列與付款方式圖示）、行事曆當日明細、以及 4 個記帳入口（手動、AI文字、收據掃描、編輯交易）的帳戶/付款方式選擇器
- 徹底刪除舊的 emoji 對照表：`lib/account-type.ts` 的 `accountTypeIcons`、`lib/payment-methods.ts` 的 `icon` 欄位與 `paymentMethodIcon()`，避免之後又被誤用
- 「更多」頁新增小熊插圖 Header（重用既有 `bear-account-management.webp`），選單全面換 Lucide 圖示
- 交易分類名稱從純文字／灰階 `Badge` 改成彩色藥丸標籤 `CategoryPill`（參考 Copilot Money 設計），套進 `TodayTransactionRow`（首頁＋行事曆共用）與完整交易列表頁

---

## 五、首頁摘要卡熊圖與帳號入口

熊圖插畫是 640×640 正方形、雙熊+道具的橫向構圖，原本用 `object-cover` 硬塞進窄直的欄位會裁到熊或道具。幾輪調整後定案：拿掉左右兩欄分割，文字用滿卡片全寬，熊圖改成 `absolute` 貼在卡片右下角、框的比例用 `aspect-square`（精準對應檔案真實尺寸，物件比例算法搞混過一次：`object-fit` 是照「檔案本身像素比例」裁切，不是「視覺上內容佔比」，這點記錄進記憶避免下次重蹈覆轍）。

同一時間把 Clerk 的 `<UserButton />` 從共用頂部 header 整個搬到「更多」選單裡新增的「帳號設定」頁（`/account/[[...rest]]`，用 Clerk 的 `<UserProfile />`），共用頂部 header 因此整個刪除，所有頁面內容改成直接從最上面開始。

---

## 六、行事曆：從唯讀變可編輯、視覺整理、熱力圖

- **明細可編輯**：行事曆當日明細原本是唯讀，改成重用首頁的 `TodayTransactionRow`（點擊編輯、左滑刪除/複製、長按快速換分類）。轉帳類型因為 `EditTransactionDialog` 的資料結構無法表示雙帳戶轉移，仍維持原本的唯讀列，不會憑空消失
- **視覺整理**：月曆格子與明細包進 `Card`；月份切換換成 `ChevronLeft`/`ChevronRight` icon 按鈕；月曆格子與明細清單套用 `StaggerList` 進場動畫；空狀態換成小熊插圖
- **熱力圖**：參考 Zaim/MoneyForward 等日系家計簿 App 與 Google Calendar 月檢視慣例，日期格子背景改用跟「每日消費熱力圖」同一套藍色色階表示支出強度，取代原本的 -123/+456 小數字；選中日期改用外框強調；收入用右上角小綠點標示。拿掉小數字後在選中日期旁新增「當日收支總計」，數字仍然一步可及

---

## 七、帳戶/目標/預算三頁加強

參考 Copilot Money、Monarch Money、YNAB 截長補短：

- **`/accounts`**：新增「總資產」卡片（含外幣即時換算，`getExchangeRateToTwd` 對 TWD 直接短路不發請求；換算失敗會誠實顯示無法取得，不會硬加總）
- **`/goals`**：把資料庫裡存在但從未顯示的 `targetDate` 顯示出來，加上「剩幾天」「每天要存多少」的達成步調提示，7天內轉紅色警示。`icon`/`color` 欄位仍未使用（沒有對應的選擇器 UI），列為待辦
- **`/budgets`**：新增月度總覽卡，仿 YNAB/Copilot 的「pacing」概念——雙進度條比較「已花 %」跟「這個月過了 %」，超前花費時上方進度條轉紅色漸層

`Progress` 元件的填色也全站改成暖色漸層（`bg-[linear-gradient(...)]`），取代原本純色 `bg-primary`，同樣參考 Copilot 的設計語言。

---

## 八、AI 快速記帳整合

- 「說一句話快速記帳」跟「拍照掃收據」合併成同一個藥丸狀輸入列，相機圖示移到輸入框內、跟送出鍵並排，不再是兩個獨立視覺區塊
- AI 文字解析、收據掃描這兩個記帳入口原本沒有「這筆算共同帳」的勾選（只有手動記帳有），現在補上，抽出共用元件 `SharedExpenseToggle`（同時把 🤝 emoji 換成 Lucide 的 `Handshake`）

---

## 九、導覽切換延遲

用戶反應切換分頁有明顯延遲。分三輪排查：

1. **零 `loading.tsx`**：查證這版 Next.js 文件確認「動態路由沒有 `loading.js` 就完全不會被預先載入」。新增全域＋首頁/行事曆/統計三個專屬骨架畫面
2. **用戶端快取預設是關的**：`staleTimes.dynamic` 預設 0 秒＝完全不快取，導致切回剛看過的分頁還是整頁重新跟伺服器要一次。開啟前先確認所有寫入動作都有完整 `revalidatePath` 涵蓋＋前端都呼叫 `router.refresh()`，才在 `next.config.ts` 設定 `staleTimes: { dynamic: 30, static: 180 }`
3. **`prefetch` 預設只載骨架不載資料**：動態路由的預設 prefetch 行為只會載到 `loading.js` 為止（骨架，沒資料），所以「第一次」點進某個分頁還是冷的。底部導覽的 5 個連結加上 `prefetch`（完整預載＋資料），讓 App 一開啟就在背景把 5 個主要分頁都預熱好

同時修掉幾個「排隊執行」的效能小坑：首頁的 `currentUser()`（Clerk API）原本排在資料庫查詢之前，改成併進同一批 `Promise.all`；帳戶頁的轉帳查詢與外幣匯率換算（原本每帳戶一次迴圈）都改成平行處理。

已確認：Neon 資料庫與 Vercel 函式都在美東同區，延遲不是區域設定問題，物理下限是台灣↔美國一趟來回；`prefetch` 的代價是每次開 App 會在背景多跑約 20-25 個查詢，個人單用戶 App 可接受。

---

## 十、其他

- 拿掉了兩個過程中用來做 A/B 視覺比較的暫時性 `/design-preview` 頁面（未連結任何選單，比較完就刪除），採用「先在隔離路由 + 非正式 Vercel 部署預覽、選定後才寫進共用元件、刪除落選方案」的流程，之後有類似「參考別的 App 改風格」需求可以延用這個模式
