# 統計報表明細收合 + 交易列表按月分組

日期：2026-07-31

## 處理內容

### 新增共用收合元件
- `src/components/ui/collapsible.tsx`：包 `@base-ui/react/collapsible`（跟這個 App 其他 UI 元件一樣的手法，Select/Dialog/BottomSheet 都是包 base-ui 的 primitive）
- `src/components/stats/collapsible-progress-list.tsx`：給 Server Component 頁面用的版本，接收已經算好、渲染好的 row（`{key, node}[]`），只顯示前 N 個，其餘收進收合面板

### 套用到 4 個原本無上限的清單
- `CategoryBreakdown`（`/stats/daily` 的分類佔比、付款方式）：超過 6 個收合
- `/stats/budgets-goals` 的本期預算清單、儲蓄目標清單：超過 5 個收合
- `/stats` 首頁的消費異常提醒：超過 5 個收合

### 交易列表按月分組
`/transactions` 原本是純時間排序的一長串，現在依 `occurredAt` 的年月分組，每組上面有「2026 年 7 月」這種標題（格式跟行事曆頁一致），組內維持原本的卡片+分隔線樣式。因為列表本來就已經照時間新到舊排序，分組用一次線性掃描就能做，不用重新排序。

## 驗證

`tsc --noEmit`、`eslint .`、`next build` 全過。已用 `npx vercel --prod` 部署。
