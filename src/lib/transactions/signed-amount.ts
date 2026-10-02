// A transaction's effect on its account, signed: money out is negative,
// money in is positive. Needed now that an expense can carry a negative
// amount — a split reimbursement is booked as a refund against the original
// expense category (see lib/transactions/settlement.ts), so "expense" no
// longer always means "money left the account".
export function signedAmount(t: { type: string; amount: string | number }): number {
  const amount = Number(t.amount);
  return t.type === "expense" ? -amount : amount;
}

// "+1,234" / "-1,234" plus whether it reads as money in — what transaction
// rows render instead of hardcoding "-" for every expense (which turned a
// refund into "--500").
export function formatSignedAmount(t: { type: string; amount: string | number }): { text: string; isInflow: boolean } {
  const signed = signedAmount(t);
  const isInflow = signed >= 0;
  return { text: `${isInflow ? "+" : "-"}${Math.abs(signed).toLocaleString("zh-TW")}`, isInflow };
}
