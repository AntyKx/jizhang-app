/**
 * Net balance across all unsettled shared expenses, from "my" point of view.
 * Positive = the partner owes me; negative = I owe the partner.
 */
export function computeNetBalance(unsettledExpenses: { paidByMe: boolean; amount: string }[]): number {
  let net = 0;
  for (const expense of unsettledExpenses) {
    const half = Number(expense.amount) / 2;
    net += expense.paidByMe ? half : -half;
  }
  return net;
}
