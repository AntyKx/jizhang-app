// An e-invoice QR code names the seller only by 統編. The Ministry of
// Economic Affairs' open company-registry API maps that to the registered
// company name (統一超商股份有限公司 → the model turns that into 7-ELEVEN).
// Public data, no key; only the seller's business number is sent. Sole
// proprietorships (行號) aren't in this dataset — those just come back null
// and the model works from the items instead.
const GCIS_COMPANY_API = "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6";

const cache = new Map<string, string | null>();

async function lookupOne(sellerId: string): Promise<string | null> {
  if (!/^\d{8}$/.test(sellerId) || sellerId === "00000000") return null;
  if (cache.has(sellerId)) return cache.get(sellerId)!;
  try {
    const url = `${GCIS_COMPANY_API}?$format=json&$filter=Business_Accounting_NO eq ${sellerId}&$skip=0&$top=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const rows = res.ok ? ((await res.json().catch(() => null)) as { Company_Name?: string }[] | null) : null;
    const name = rows?.[0]?.Company_Name?.trim() || null;
    cache.set(sellerId, name);
    return name;
  } catch {
    // Slow or down — not cached, so the next scan tries again.
    return null;
  }
}

export async function lookupSellerNames(sellerIds: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(sellerIds)];
  const names = await Promise.all(unique.map(lookupOne));
  return new Map(unique.map((id, i) => [id, names[i]]));
}
