export const BASE_CURRENCY = "TWD";

export const supportedCurrencies = {
  TWD: "新台幣 (TWD)",
  USD: "美元 (USD)",
  JPY: "日圓 (JPY)",
  EUR: "歐元 (EUR)",
  CNY: "人民幣 (CNY)",
  HKD: "港幣 (HKD)",
  GBP: "英鎊 (GBP)",
  KRW: "韓元 (KRW)",
  AUD: "澳幣 (AUD)",
  SGD: "新加坡幣 (SGD)",
  THB: "泰銖 (THB)",
  VND: "越南盾 (VND)",
} as const;

export type CurrencyCode = keyof typeof supportedCurrencies;

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return value in supportedCurrencies;
}

// TWD and JPY are the two currencies actually in use here where a decimal
// amount is never meaningful in daily spending — every other supported
// currency (USD, EUR, etc.) keeps its decimal point, since a fractional
// amount there is a real one (e.g. $12.50), not just visual clutter on the
// keypad. Undefined/unrecognized currency defaults to allowing it, the
// safer direction (never silently blocks a legitimate amount).
const NO_DECIMAL_CURRENCIES = new Set(["TWD", "JPY"]);

export function currencyAllowsDecimal(currency: string | undefined): boolean {
  if (!currency) return true;
  return !NO_DECIMAL_CURRENCIES.has(currency);
}
