export const accountTypeLabels = {
  cash: "現金",
  bank: "銀行帳戶",
  credit_card: "信用卡",
  e_wallet: "電子錢包",
  investment: "投資",
  loan: "貸款",
} as const;

// Icons live in `src/components/accounts/account-type-icon.tsx` (Lucide),
// not here as emoji.
export type AccountType = keyof typeof accountTypeLabels;

export const accountTypeToPaymentMethod = {
  cash: "cash",
  bank: "debit_card",
  credit_card: "credit_card",
  e_wallet: "mobile_payment",
  investment: "other",
  loan: "other",
} as const satisfies Record<AccountType, string>;

// Turns the opening-balance keypad's raw string into the stored number.
// Loans are typed as the positive amount still owed and stored negative (a
// debt), so nobody has to think about the sign. Credit cards may carry a
// sign from the keypad's +/− toggle; every other type is a plain balance,
// and a sign left over from toggling it on a credit card and then
// switching the type away is dropped.
export function initialBalanceFromInput(type: AccountType, raw: string): number {
  const abs = Number(raw.replace("-", "")) || 0;
  if (type === "loan") return -abs;
  if (type === "credit_card") return raw.startsWith("-") ? -abs : abs;
  return abs;
}
