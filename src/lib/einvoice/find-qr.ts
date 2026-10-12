import jsQR from "jsqr";
import { isLeftCode, isRightCode, parseEInvoice, type EInvoice } from "@/lib/einvoice/qr";

type Point = { x: number; y: number };

// jsQR finds one code per pass. An e-invoice has two side by side, so after
// each hit the code is painted over and the image scanned again.
function findCodes(ctx: CanvasRenderingContext2D, width: number, height: number, max = 3): Uint8Array[] {
  const found: Uint8Array[] = [];
  for (let i = 0; i < max; i++) {
    const { data } = ctx.getImageData(0, 0, width, height);
    const hit = jsQR(data, width, height, { inversionAttempts: "dontInvert" });
    if (!hit) break;
    found.push(Uint8Array.from(hit.binaryData));
    const { topLeftCorner: a, topRightCorner: b, bottomRightCorner: c, bottomLeftCorner: d } = hit.location;
    const cx = (a.x + c.x) / 2;
    const cy = (a.y + c.y) / 2;
    // Grow the patch a little so the quiet zone/finder edges don't re-match.
    const grow = (p: Point) => ({ x: cx + (p.x - cx) * 1.25, y: cy + (p.y - cy) * 1.25 });
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    [a, b, c, d].map(grow).forEach((p, j) => (j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }
  return found;
}

export type QrHits = { left: Uint8Array[]; right: Uint8Array[] };

// Draws `source` (scaled so its long side is at most `maxSide`) and returns
// the e-invoice codes in it, split into left and right halves.
export function scanForInvoiceCodes(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxSide: number,
  canvas: HTMLCanvasElement = document.createElement("canvas"),
): QrHits {
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { left: [], right: [] };
  ctx.drawImage(source, 0, 0, width, height);
  const codes = findCodes(ctx, width, height);
  return { left: codes.filter(isLeftCode), right: codes.filter(isRightCode) };
}

// One photo → at most one invoice (the first left code, with a right code
// if one was found next to it). Null when the photo has no readable
// e-invoice code — the caller then falls back to plain photo reading.
export async function readInvoiceFromFile(file: File): Promise<EInvoice | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const hits = scanForInvoiceCodes(bitmap, bitmap.width, bitmap.height, 2000);
    bitmap.close();
    if (hits.left.length === 0) return null;
    return parseEInvoice(hits.left[0], hits.right[0]);
  } catch {
    return null;
  }
}
