# 記帳本

AI 輔助的智慧記帳網頁應用，使用 Next.js（App Router）+ Neon Postgres（Drizzle ORM）+ Clerk + Vercel AI SDK。

## 功能

- 基礎記帳：多帳戶、分類、收入/支出/轉帳
- 自然語言快速記帳（AI 解析一句話成結構化交易）
- 預算追蹤、儲蓄目標、連續記帳天數
- 定期收支 / 訂閱管理、30 天現金流預測

## 開始之前

需要準備兩項外部服務（皆可透過 Vercel Marketplace 一鍵串接，或自行申請）：

1. **Neon Postgres** — 資料庫
2. **Clerk** — 登入/會員系統

複製 `.env.example` 為 `.env.local` 並填入：

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
AI_GATEWAY_API_KEY=   # 本機開發用；部署在 Vercel 上會自動透過 OIDC 提供
```

## 開發指令

```bash
npm install
npm run db:push     # 依 src/db/schema.ts 建立資料表
npm run db:seed      # 匯入預設分類（餐飲、交通…等）
npm run dev
```

開啟 http://localhost:3000

其他資料庫指令：`npm run db:generate`（產生 migration）、`npm run db:studio`（開啟 Drizzle Studio 檢視資料）。
