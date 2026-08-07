import type { StatsRange } from "@/lib/stats/range";
import { getCategoryBreakdown } from "@/lib/stats/category-queries";

export type CashFlowNode = { name: string; color?: string };
export type CashFlowLink = { source: number; target: number; value: number };
export type CashFlowSankeyData = { nodes: CashFlowNode[]; links: CashFlowLink[] };

const HUB_NAME = "本期收入";
const SAVINGS_NAME = "結餘";

// Income sources -> a single "hub" node -> expense categories (+ leftover
// savings, if any). Needs at least some income to make sense — a Sankey
// can't represent "money materializing" for expenses with zero inflow, so
// callers should treat a null return as an empty state.
export async function getCashFlowSankey(userId: string, range: StatsRange): Promise<CashFlowSankeyData | null> {
  const [incomeSlices, expenseSlices] = await Promise.all([
    getCategoryBreakdown(userId, range, "income"),
    getCategoryBreakdown(userId, range, "expense"),
  ]);

  const incomeItems = incomeSlices.filter((s) => s.amount > 0);
  const expenseItems = expenseSlices.filter((s) => s.amount > 0);
  const totalIncome = incomeItems.reduce((sum, s) => sum + s.amount, 0);
  const totalExpense = expenseItems.reduce((sum, s) => sum + s.amount, 0);

  if (totalIncome <= 0 || (incomeItems.length === 0 && expenseItems.length === 0)) return null;

  const nodes: CashFlowNode[] = [];
  const links: CashFlowLink[] = [];

  incomeItems.forEach((s) => nodes.push({ name: s.name, color: s.color }));
  const hubIndex = nodes.length;
  nodes.push({ name: HUB_NAME });

  const expenseStartIndex = nodes.length;
  expenseItems.forEach((s) => nodes.push({ name: s.name, color: s.color }));

  incomeItems.forEach((s, i) => links.push({ source: i, target: hubIndex, value: s.amount }));
  expenseItems.forEach((s, i) => links.push({ source: hubIndex, target: expenseStartIndex + i, value: s.amount }));

  const leftover = totalIncome - totalExpense;
  if (leftover > 0) {
    const savingsIndex = nodes.length;
    nodes.push({ name: SAVINGS_NAME, color: "#1baf7a" });
    links.push({ source: hubIndex, target: savingsIndex, value: leftover });
  }

  return { nodes, links };
}
