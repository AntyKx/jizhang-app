import { BASE_CURRENCY } from "@/lib/currency";

// Free, keyless FX data (github.com/fawazahmed0/currency-api), mirrored on
// two independent hosts. There's no Vercel Marketplace category for FX rate
// data, so this isn't a provisioned integration — just a public data fetch,
// same as calling any other public API.
function primaryUrl(date: string, currency: string) {
  return `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${currency}.json`;
}
function fallbackUrl(date: string, currency: string) {
  return `https://${date}.currency-api.pages.dev/v1/currencies/${currency}.json`;
}

async function fetchRates(date: string, currency: string): Promise<Record<string, number> | null> {
  for (const url of [primaryUrl(date, currency), fallbackUrl(date, currency)]) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, Record<string, number>>;
      const rates = data[currency];
      if (rates) return rates;
    } catch {
      // try the next host
    }
  }
  return null;
}

/**
 * Exchange rate to convert an amount in `currency` into TWD, as of `date`
 * ("yyyy-MM-dd"). Always 1 for TWD itself. Falls back to the latest
 * available rate if the requested date has no data yet (e.g. today, before
 * the day's rates are published) or is otherwise unreachable.
 */
export async function getExchangeRateToTwd(currency: string, date: string): Promise<number> {
  const normalized = currency.toLowerCase();
  if (normalized === BASE_CURRENCY.toLowerCase()) return 1;

  const rates = (await fetchRates(date, normalized)) ?? (await fetchRates("latest", normalized));
  if (!rates) throw new Error("目前無法取得匯率，請稍後再試");

  const rate = rates[BASE_CURRENCY.toLowerCase()];
  if (typeof rate !== "number") throw new Error(`不支援的幣別：${currency}`);
  return rate;
}
