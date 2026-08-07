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
