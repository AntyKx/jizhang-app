import { Banknote, CircleHelp, CreditCard, Landmark, RefreshCw, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { paymentMethodLabel } from "@/lib/payment-methods";

// Lucide replacements for the old emoji icons in `paymentMethods` — see
// account-type-icon.tsx for the same rationale.
const icons: Record<string, typeof Banknote> = {
  cash: Banknote,
  credit_card: CreditCard,
  debit_card: Landmark,
  mobile_payment: Smartphone,
  auto_debit: RefreshCw,
  other: CircleHelp,
};

export function PaymentMethodIcon({ method, className }: { method: string; className?: string }) {
  const Icon = icons[method] ?? CircleHelp;
  return (
    <Icon
      className={cn("size-3.5 shrink-0", className)}
      strokeWidth={1.75}
      aria-label={paymentMethodLabel(method)}
    />
  );
}
