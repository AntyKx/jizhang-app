import { z } from "zod";

// An EInvoice (see qr.ts) as the client sends it to the scan APIs. The
// numbers came off a QR code on the user's own phone, so they're trusted as
// the user's input, but still bounded like any other request body.
export const eInvoiceSchema = z.object({
  invoiceNumber: z.string().regex(/^[A-Z]{2}\d{8}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().positive().max(100_000_000),
  sellerId: z.string().regex(/^\d{8}$/),
  items: z
    .array(z.object({ name: z.string().max(100), qty: z.number(), price: z.number() }))
    .max(100),
});

export function describeItemsForPrompt(items: z.infer<typeof eInvoiceSchema>["items"]) {
  return items.length > 0 ? items.map((i) => `${i.name} x${i.qty} 單價${i.price}`).join("、") : "（QR Code 沒有品項）";
}
