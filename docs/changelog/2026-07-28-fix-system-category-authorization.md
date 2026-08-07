# 修正系統預設分類可被任何使用者編輯/刪除的漏洞

日期：2026-07-28

## 背景

繼續同一天的優化/審查，這次挖到一個實際的授權漏洞：`categories` 表用 `userId IS NULL` 代表「系統預設分類，所有人共用可見」（見 `schema.ts` 註解）。但 `src/app/(app)/categories/actions.ts` 的 `updateCategory`／`deleteCategory`／`reorderCategories` 的 `where` 條件都是 `and(eq(categories.id, id), or(isNull(categories.userId), eq(categories.userId, userId)))`——也就是「userId 是 null，或屬於我」都算符合條件。這代表任何一個使用者都能重新命名、換圖示、甚至刪除全站共用的系統預設分類，而且 UI（`/categories` 頁面）完全沒有區分系統分類跟個人分類，每一個分類 tile 都可以點擊編輯、點右上角 ✕ 刪除——是可以直接在正常操作流程裡踩到的漏洞，不是理論風險。

## 處理內容

1. **`src/app/(app)/categories/actions.ts`**：`updateCategory`／`deleteCategory`／`reorderCategories` 的 `where` 一律改成嚴格 `eq(categories.userId, userId)`，不再允許 `isNull` 分支。`updateCategory`／`deleteCategory` 改用 `.returning()` 確認真的有改到列，沒有的話 throw 明確錯誤（「系統預設分類無法編輯／刪除，或找不到指定的分類」）；`reorderCategories` 維持 best-effort（同一次拖曳可能混雜系統與個人分類，系統分類的那幾筆會靜默不生效，個人分類仍正常排序）。

2. **`src/app/(app)/categories/page.tsx`**：查詢多選 `categories.userId` 欄位一併傳給前端，並在說明文字加註「系統預設分類無法編輯或刪除」。

3. **`src/components/categories/category-sortable-grid.tsx`**：系統分類的 tile 不再顯示右上角刪除鈕，點擊也不會打開編輯視窗，改成跳 toast 說明原因，避免使用者點了以後動作被伺服器端悄悄擋掉、卻不知道為什麼沒反應。

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。
