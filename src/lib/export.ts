import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { getCategoryBreakdown } from "@/lib/stats/category-queries";
import type { StatsRange } from "@/lib/stats/range";

const typeLabels: Record<string, string> = { income: "收入", expense: "支出", transfer: "轉帳" };

export type ExportRow = {
  occurredAt: string;
  type: string;
  category: string;
  account: string;
  toAccount: string;
  amount: number;
  fee: number;
  currency: string;
  amountTWD: number;
  paymentMethod: string;
  note: string;
};

// Full, all-time export of every transaction — this is the "take my data
// with me" / backup path, so unlike the stats queries it's deliberately not
// scoped to a date range.
export async function getExportTransactions(userId: string): Promise<ExportRow[]> {
  const [rows, userAccounts] = await Promise.all([
    db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        feeAmount: transactions.feeAmount,
        exchangeRate: transactions.exchangeRate,
        paymentMethod: transactions.paymentMethod,
        note: transactions.note,
        occurredAt: transactions.occurredAt,
        createdAt: transactions.createdAt,
        accountId: transactions.accountId,
        toAccountId: transactions.toAccountId,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(asc(transactions.occurredAt), asc(transactions.createdAt)),
    db
      .select({ id: accounts.id, name: accounts.name, currency: accounts.currency })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
  ]);

  const accountsById = new Map(userAccounts.map((a) => [a.id, a]));

  return rows.map((r) => ({
    occurredAt: r.occurredAt,
    type: typeLabels[r.type] ?? r.type,
    category: r.categoryName ?? (r.type === "transfer" ? "" : "未分類"),
    account: accountsById.get(r.accountId)?.name ?? "",
    toAccount: r.toAccountId ? (accountsById.get(r.toAccountId)?.name ?? "") : "",
    amount: Number(r.amount),
    fee: Number(r.feeAmount),
    currency: accountsById.get(r.accountId)?.currency ?? "TWD",
    amountTWD: Number(r.amount) * Number(r.exchangeRate),
    paymentMethod: paymentMethodLabel(r.paymentMethod),
    note: r.note ?? "",
  }));
}

const csvHeader = ["日期", "類型", "分類", "帳戶", "轉入帳戶", "金額", "手續費", "幣別", "換算金額(TWD)", "付款方式", "備註"];

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Leading BOM so Excel on Windows reads the UTF-8 Chinese text correctly
// instead of mis-detecting the encoding.
export function toCsv(rows: ExportRow[]): string {
  const lines = [csvHeader.join(",")];
  for (const r of rows) {
    lines.push(
      [r.occurredAt, r.type, r.category, r.account, r.toAccount, r.amount, r.fee, r.currency, r.amountTWD.toFixed(2), r.paymentMethod, r.note]
        .map(csvEscape)
        .join(","),
    );
  }
  return String.fromCharCode(0xfeff) + lines.join("\n");
}

export async function toWorkbookBuffer(rows: ExportRow[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("交易明細");
  sheet.columns = [
    { header: "日期", key: "occurredAt", width: 12 },
    { header: "類型", key: "type", width: 8 },
    { header: "分類", key: "category", width: 14 },
    { header: "帳戶", key: "account", width: 14 },
    { header: "轉入帳戶", key: "toAccount", width: 14 },
    { header: "金額", key: "amount", width: 12 },
    { header: "手續費", key: "fee", width: 10 },
    { header: "幣別", key: "currency", width: 8 },
    { header: "換算金額(TWD)", key: "amountTWD", width: 16 },
    { header: "付款方式", key: "paymentMethod", width: 10 },
    { header: "備註", key: "note", width: 24 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) sheet.addRow(r);
  return wb.xlsx.writeBuffer();
}

export async function buildMonthlyReportWorkbook(userId: string, range: StatsRange): Promise<ExcelJS.Buffer> {
  const [incomeCats, expenseCats] = await Promise.all([
    getCategoryBreakdown(userId, range, "income"),
    getCategoryBreakdown(userId, range, "expense"),
  ]);
  const income = incomeCats.reduce((sum, c) => sum + c.amount, 0);
  const expense = expenseCats.reduce((sum, c) => sum + c.amount, 0);

  const wb = new ExcelJS.Workbook();

  const summary = wb.addWorksheet("月報摘要");
  summary.columns = [
    { key: "label", width: 14 },
    { key: "value", width: 18 },
  ];
  summary.addRow({ label: "月份", value: range.label });
  summary.addRow({ label: "收入", value: income });
  summary.addRow({ label: "支出", value: expense });
  summary.addRow({ label: "結餘", value: income - expense });
  summary.eachRow((row) => (row.getCell(1).font = { bold: true }));

  const breakdownColumns = [
    { header: "分類", key: "name", width: 16 },
    { header: "金額", key: "amount", width: 14 },
    { header: "佔比", key: "pct", width: 10 },
  ];

  const expenseSheet = wb.addWorksheet("支出分類");
  expenseSheet.columns = breakdownColumns;
  expenseSheet.getRow(1).font = { bold: true };
  for (const c of expenseCats) expenseSheet.addRow({ name: c.name, amount: c.amount, pct: `${c.pct.toFixed(1)}%` });

  const incomeSheet = wb.addWorksheet("收入分類");
  incomeSheet.columns = breakdownColumns;
  incomeSheet.getRow(1).font = { bold: true };
  for (const c of incomeCats) incomeSheet.addRow({ name: c.name, amount: c.amount, pct: `${c.pct.toFixed(1)}%` });

  return wb.xlsx.writeBuffer();
}
