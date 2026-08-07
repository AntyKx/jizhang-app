# 雲端備份與還原

日期：2026-07-31

## 背景

原本的「雲端同步」其實只是即時寫入資料庫 + 單向的 CSV/Excel 匯出，沒有真正的備份/還原機制——資料庫被誤刪或損毀時沒有救回的方法。討論取代 vs 合併兩種業界常見的還原模式後，決定採用**取代式（replace）**還原：還原前清空現有資料，再載入備份內容，語意等同一般 App 的「災難復原」而非「匯入」。

## 處理內容

### 備份匯出
`GET /api/export/backup`：查詢使用者所有 7 張內容表（categories／accounts／recurringRules／transactions／budgets／savingsGoals／sharedExpenses）+ `userSettings` 的三個內容欄位，組成 JSON 檔下載。用 `requireCoreAccessApi` 擋（跟其他匯出功能同一個付費層級）。

### 還原
`restoreBackup()`（`src/app/(app)/data-export/actions.ts`）：
1. 用 `src/lib/backup-schema.ts` 的 Zod schema 驗證上傳的 JSON，格式錯誤會擋下並顯示中文錯誤訊息。
2. 用 `db.batch([...])` 原子清空 7 張內容表（跟 `deleteAllUserData()` 同樣的刪除順序，但**不刪 `userSettings`**）。
3. 依 FK 順序（categories → accounts → recurringRules → transactions → budgets → savingsGoals → sharedExpenses）依序 insert，每張表只在陣列非空時才 insert，每一筆都重新塞入目前登入者的 `userId`（備份檔本身不帶 `userId`，就算帶了也會被忽略）。
4. `userSettings` 用 `onConflictDoUpdate` 只更新 `partnerName`／`baseCurrency`／`monthStartDay`，**絕不**觸碰 `hasPurchasedCore`／`stripeCustomerId`／`stripeSubscriptionId`／`aiSubscriptionStatus`／`aiSubscriptionCurrentPeriodEnd` 這些計費/權限欄位——這些只能由 Stripe webhook 寫入，備份檔案 schema 上也直接不包含這些欄位。

### UI
`data-export/page.tsx` 新增「備份與還原」卡片（核心解鎖功能，跟匯出同一層級）：下載備份按鈕 + `RestoreBackupDialog`（`src/components/data-export/restore-backup-dialog.tsx`，選檔案 + 打字確認「取代還原」才能按下去，沿用 `delete-all-data-dialog.tsx` 的確認文字模式）。

## 已知限制

還原的 insert 階段是**依序**呼叫而非單一 atomic batch（neon-http 的 `db.batch()` 需要固定長度的陣列字面值做 TS tuple 推斷，跟「依內容有無、動態決定要不要 insert 某張表」互斥）。若中途某一步失敗，前面已成功的 insert 不會回滾——清空階段仍然是原子的，但還原重建階段目前不是完全 all-or-nothing。之後若要收斂這個限制，需要固定長度陣列（每張表永遠塞、空陣列也塞）或等 neon-http 支援真正的 transaction。

## 驗證

`tsc --noEmit`、`eslint`（新增/改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。
