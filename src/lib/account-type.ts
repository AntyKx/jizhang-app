export const accountTypeLabels = {
  cash: "現金",
  bank: "銀行帳戶",
  credit_card: "信用卡",
  e_wallet: "電子錢包",
  investment: "投資",
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
} as const satisfies Record<AccountType, string>;
