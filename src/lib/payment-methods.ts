import type { AccountType } from "@/lib/account-type";

export type PaymentMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "mobile_payment"
  | "auto_debit"
  | "other";

// Icons live in `src/components/transactions/payment-method-icon.tsx`
// (Lucide), not here as emoji.
export const paymentMethods: {
  value: PaymentMethod;
  label: string;
  color: string;
}[] = [
  { value: "cash", label: "現金", color: "#2a78d6" },
  { value: "credit_card", label: "信用卡", color: "#eb6834" },
  { value: "debit_card", label: "金融卡", color: "#1baf7a" },
  { value: "mobile_payment", label: "行動支付", color: "#eda100" },
  { value: "auto_debit", label: "自動扣款", color: "#4a3aa7" },
  { value: "other", label: "其他", color: "#898781" },
];

// Which methods are actually possible for money coming out of each kind of
// account. The account already *is* the payment instrument, so the derived
// value (accountTypeToPaymentMethod) covers almost every entry — this list
// only exists for the case where the payment rail differs from the funding
// source, e.g. paying with LINE Pay off a credit card. Offering all six
// everywhere is what produced the impossible combinations in the data
// (信用卡帳戶付現金, 銀行帳戶刷信用卡).
//
// Each list starts with that type's own derived default. `other` is always
// available as an escape hatch.
export const paymentMethodsForAccountType: Record<AccountType, PaymentMethod[]> = {
  cash: ["cash", "other"],
  bank: ["debit_card", "mobile_payment", "auto_debit", "other"],
  credit_card: ["credit_card", "mobile_payment", "auto_debit", "other"],
  e_wallet: ["mobile_payment", "auto_debit", "other"],
  investment: ["other", "auto_debit"],
};

export function paymentMethodLabel(value: string): string {
  return paymentMethods.find((p) => p.value === value)?.label ?? "其他";
}

export function paymentMethodColor(value: string): string {
  return paymentMethods.find((p) => p.value === value)?.color ?? "#898781";
}
