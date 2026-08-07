import { Banknote, CreditCard, Landmark, Smartphone, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/lib/account-type";

// Lucide replacements for the old emoji `accountTypeIcons` map — system
// iconography is line icons app-wide (bear illustrations stay reserved for
// categories and scene art).
const icons = {
  cash: Banknote,
  bank: Landmark,
  credit_card: CreditCard,
  e_wallet: Smartphone,
  investment: TrendingUp,
} as const satisfies Record<AccountType, unknown>;

export function AccountTypeIcon({ type, className }: { type: AccountType; className?: string }) {
  const Icon = icons[type];
  return <Icon className={cn("size-4 shrink-0", className)} strokeWidth={1.75} />;
}
