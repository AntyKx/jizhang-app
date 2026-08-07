# 帳號設定改成自製簡易版

日期：2026-08-05

## 背景

使用者反應 `/account` 用的 Clerk 原生 `<UserProfile />` 元件太複雜，很多功能（MFA、連結帳號、裝置管理等企業向設定）一般記帳 App 使用者看不懂。跟使用者確認後，選擇「重做成簡易版」而不是只換色/翻譯——直接拿掉 `<UserProfile />`，改成自己刻的頁面，只留使用者真的會用到的東西。

## 處理內容

- 刪除 `src/app/(app)/account/[[...rest]]/page.tsx`（Clerk 的 catch-all 路由結構已不需要），改成一般的 `src/app/(app)/account/page.tsx`
- 新增 `src/components/account/account-settings.tsx`，用 Clerk 的 client hooks（`useUser`／`useClerk`）直接操作，不再依賴 `<UserProfile>`：
  - 大頭貼：點擊圓形頭像即可上傳新圖片（`user.setProfileImage`）
  - 顯示名稱：可編輯並儲存（`user.update({ firstName })`）
  - Email：唯讀顯示（改 Email 需要 Clerk 的驗證碼流程，簡易版先不做）
  - **登出**：App 裡原本完全沒有登出按鈕（Clerk 的 `<UserProfile>` 本身也不內建這個），這次補上
  - **刪除帳號**：比照 `/data-export` 既有的「刪除全部資料」型式輸入確認文字再刪除。實際刪除順序是先呼叫既有的 `deleteAllUserData()`（清空這個 userId 名下所有記帳資料），再呼叫 `user.delete()`（移除 Clerk 登入帳號）——因為 App 資料庫用 userId 純文字關聯 Clerk，沒有 webhook 做 cascade delete，如果先刪 Clerk 帳號會留下永遠孤兒的資料列，順序反過來才對
- `more/page.tsx` 的「帳號設定」說明文字同步更新（拿掉不存在的「登入安全性」字樣）

## 驗證

`tsc --noEmit`、`eslint`（改動檔案）、`next build` 全過，已用 `npx vercel --prod` 部署。刪除路由後 `.next` 快取有殘留舊路由型別導致 tsc 報錯，`rm -rf .next` 後重新檢查即正常，非真正的程式碼問題。
