// Taiwan e-invoice (電子發票證明聯) QR codes. The left code carries the
// invoice itself plus the first items; the right one starts with "**" and
// continues the item list. Pure functions over the raw QR bytes, so the
// same parser runs on a photo and on live camera frames.
//
// Left code layout (財政部 電子發票證明聯一維及二維條碼規格):
//   [0,10)  invoice number      AB12345678
//   [10,17) date, ROC calendar  1131012
//   [17,21) random code
//   [21,29) sales amount (pre-tax), hex
//   [29,37) total amount, hex
//   [37,45) buyer 統編 (00000000 = none)
//   [45,53) seller 統編
//   [53,77) encryption
//   then ":" + self-use(10) ":" items-in-codes ":" items-total ":" encoding ":" name:qty:price:...
// encoding: 0 = Big5, 1 = UTF-8, 2 = Base64.

export type EInvoiceItem = { name: string; qty: number; price: number };

export type EInvoice = {
  invoiceNumber: string;
  date: string; // yyyy-MM-dd
  total: number;
  sellerId: string;
  items: EInvoiceItem[];
};

const LEFT_HEADER = /^[A-Z]{2}\d{8}\d{7}[0-9A-Za-z]{4}[0-9a-fA-F]{16}\d{16}/;

function latin1(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

export function isLeftCode(bytes: Uint8Array) {
  return LEFT_HEADER.test(latin1(bytes.subarray(0, 60)));
}

export function isRightCode(bytes: Uint8Array) {
  return bytes[0] === 0x2a && bytes[1] === 0x2a; // "**"
}

function decodeText(bytes: Uint8Array, encoding: string) {
  try {
    return new TextDecoder(encoding === "0" ? "big5" : "utf-8").decode(bytes);
  } catch {
    return latin1(bytes);
  }
}

function fromBase64(s: string): string | null {
  try {
    const bin = atob(s);
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

function parseItems(fields: string[], encoding: string): EInvoiceItem[] {
  // Base64 sellers encode either the whole item run or each name — try both.
  if (encoding === "2") {
    const whole = fromBase64(fields.join(":"));
    if (whole && whole.includes(":")) fields = whole.split(":");
    else fields = fields.map((f, i) => (i % 3 === 0 ? (fromBase64(f) ?? f) : f));
  }
  const items: EInvoiceItem[] = [];
  for (let i = 0; i + 2 < fields.length; i += 3) {
    const name = fields[i].trim();
    const qty = Number(fields[i + 1]);
    const price = Number(fields[i + 2]);
    if (!name || !Number.isFinite(qty) || !Number.isFinite(price)) continue;
    items.push({ name, qty, price });
  }
  return items;
}

// `right` is optional — without it the items are just whatever fit in the
// left code (often all of them on a short receipt).
export function parseEInvoice(left: Uint8Array, right?: Uint8Array | null): EInvoice | null {
  const head = latin1(left.subarray(0, 77));
  if (!LEFT_HEADER.test(head)) return null;

  const rocYear = Number(head.slice(10, 13));
  const month = Number(head.slice(13, 15));
  const day = Number(head.slice(15, 17));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const total = parseInt(head.slice(29, 37), 16);
  if (!Number.isFinite(total) || total <= 0) return null;

  // Header is ASCII, so the encoding flag can be read before decoding names.
  const tailLatin = latin1(left.subarray(77));
  const meta = tailLatin.startsWith(":") ? tailLatin.slice(1).split(":") : [];
  const encoding = meta[3] ?? "1";

  const tail = meta.length > 4 ? decodeText(left.subarray(77), encoding).slice(1).split(":").slice(4).join(":") : "";
  const rest = right && isRightCode(right) ? decodeText(right.subarray(2), encoding) : "";
  const joined = !tail ? rest : !rest || tail.endsWith(":") ? tail + rest : `${tail}:${rest}`;
  const items = joined ? parseItems(joined.split(":"), encoding) : [];

  return {
    invoiceNumber: head.slice(0, 10),
    date: `${rocYear + 1911}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    total,
    sellerId: head.slice(45, 53),
    items,
  };
}

// For the transaction note: "拿鐵、三明治 x2". Kept within the note's
// 200-char limit.
export function itemsToNote(items: EInvoiceItem[], max = 200): string | null {
  if (items.length === 0) return null;
  const text = items.map((i) => (i.qty === 1 ? i.name : `${i.name} x${i.qty}`)).join("、");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
