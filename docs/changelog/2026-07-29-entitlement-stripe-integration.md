# Entitlement 系統與 Stripe 金流串接

日期：2026-07-29

## 背景

延續同一天稍早定案的商業模式（一次性解鎖 NT$199／AI 訂閱 NT$49 月）與技術規劃，這次把整套 entitlement（權限判斷）系統跟 Stripe 金流實際串起來。之前完全沒有任何付費/權限相關程式碼。

透過 `vercel integration discover --category payments` 確認 Stripe 是 Marketplace 上 payments 分類唯一/首選選項，走 `vercel integration add stripe` 安裝（需要先在瀏覽器接受 Marketplace 條款，這步 CLI 無法代勞）。

## 處理內容

### Schema
`userSettings` 新增 `hasPurchasedCore`、`corePurchasedAt`、`stripeCustomerId`、`stripeSubscriptionId`、`aiSubscriptionStatus`（新 pgEnum：none/active/past_due/canceled）、`aiSubscriptionCurrentPeriodEnd`。新表 `aiUsageEvents`（AI 用量流水帳，供配額與 rate limit 查詢，`(user_id, created_at)` 複合索引）。

### `src/lib/entitlements.ts`（新檔）
- `hasCoreAccess`／`requireCoreAccess`（page 用，redirect 到 `/upgrade`）／`requireCoreAccessApi`（API route 用，回 403 JSON）
- `getAiUsageStatus`：先查最近 1 小時用量做 rate limit（20 次/小時，不分方案，防濫用），再依訂閱狀態判斷月配額（訂閱中 1000 次/月防失控；免費文字記帳 20 次/月、收據辨識 5 次/月，收據辨識吃 vision token 成本較高所以配額抓低）
- `recordAiUsage`：AI 呼叫**成功後**才寫入，失敗不計入配額

### 套用到既有功能
- 多帳戶：`accounts/actions.ts` `createAccount()` 擋第 2 個帳戶
- 進階統計／預算目標統計：`stats/advanced`、`stats/budgets-goals` 兩個 page 各自加 `requireCoreAccess`
- 資料匯出：`data-export/page.tsx` 只鎖「匯出」卡片（刪除所有資料維持所有人可用——這是隱私權政策已經承諾的當事人權利，不能綁付費），3 個 `api/export/*` route 加 `requireCoreAccessApi`
- 共同帳本：`shared/page.tsx` + `shared/actions.ts` 每個 exported action 都加檢查；`main-nav.tsx` 的「共同」nav 項目在未解鎖時顯示鎖頭圖示
- AI 記帳：`quick-add`／`receipt-scan`／`shared-quick-add` 三個 route 呼叫 AI 前檢查 `getAiUsageStatus`，成功後 `recordAiUsage`；前端三個 quick-add 元件都補上讀取 429 回應真正錯誤訊息的邏輯（原本統一吞成「AI 看不懂」，現在配額用完/操作太頻繁會顯示正確提示）

### Stripe
- `src/lib/stripe.ts`：共用 Stripe client + `getSiteOrigin()`（從request header 動態算網址，不寫死網域，preview 部署也能用）
- 用 Stripe API 建立兩個 Price（一次性 NT$199、訂閱月繳 NT$49，TWD 在 Stripe 是 2 位小數幣別不是 zero-decimal，所以 `unit_amount` 用 19900／4900）
- 建立預設 Billing Portal 設定（允許取消訂閱、更新付款方式）
- `upgrade/page.tsx` + `upgrade/actions.ts`：兩張方案卡片、Checkout Session（一次性/訂閱）、Billing Portal Session
- `api/webhooks/stripe/route.ts`：驗證簽章後處理 `checkout.session.completed`（mode=payment）、`customer.subscription.created/updated/deleted`；用 `stripeCustomerId` 反查 userId（`client_reference_id` 當備援）。**踩坑**：這個 SDK 版本的 `current_period_end` 已經搬到 `subscription.items.data[0]`，不在 subscription 物件本身上了，直接讀舊欄位會是 undefined
- `proxy.ts` 公開路由加 `/api/webhooks/stripe`（Stripe 呼叫不會帶 Clerk session）

## 驗證

`tsc --noEmit`、`eslint`、`next build` 全過。用 `stripe.webhooks.generateTestHeaderString` 產生簽章正確的測試事件，實際打去部署後的 production webhook endpoint，確認：
- `checkout.session.completed` → `hasPurchasedCore` 真的變成 true
- `customer.subscription.updated`（active）→ `aiSubscriptionStatus`／`stripeSubscriptionId`／`aiSubscriptionCurrentPeriodEnd` 真的被寫入

測試用的 Stripe customer 與 DB 假資料事後都清乾淨了。已用 `npx vercel --prod` 部署，production 別名 https://jizhang-app-sand.vercel.app 。

## 目前是測試模式（test mode）

Stripe 這次是透過 Vercel Marketplace 裝的 **Sandbox 資源**（test mode），Price ID、webhook 都是 test mode 版本。正式上線收費前，需要在 Stripe 後台把 sandbox 升級/claim 成正式帳號、重新建立正式（live mode）的 Price 跟 webhook endpoint，並把對應的 live 版 key／Price ID／webhook secret 換到 Vercel 環境變數裡。
