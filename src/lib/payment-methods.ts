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

export function paymentMethodLabel(value: string): string {
  return paymentMethods.find((p) => p.value === value)?.label ?? "其他";
}

export function paymentMethodColor(value: string): string {
  return paymentMethods.find((p) => p.value === value)?.color ?? "#898781";
}
