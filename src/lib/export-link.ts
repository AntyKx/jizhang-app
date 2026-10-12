import { createHmac, timingSafeEqual } from "node:crypto";
import { auth } from "@clerk/nextjs/server";

// The Android app's WebView has no download handling, so tapping an export
// link there did nothing at all. Instead the app asks for a short-lived
// signed link and hands it to the phone's browser, which has no Clerk
// session — the token stands in for one, for this user and this one export.
export const EXPORT_KINDS = ["csv", "xlsx", "monthly-report", "backup"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

const TTL_MS = 5 * 60 * 1000;

function key() {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("CLERK_SECRET_KEY missing");
  // Derived, so the raw Clerk key is never itself the HMAC key.
  return createHmac("sha256", secret).update("jizhang-export-link-v1").digest();
}

function sign(payload: string) {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export function signExportToken(userId: string, kind: ExportKind) {
  const payload = Buffer.from(JSON.stringify({ u: userId, k: kind, e: Date.now() + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyExportToken(token: string, kind: ExportKind): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { u, k, e } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; k: string; e: number };
    if (k !== kind || typeof e !== "number" || e < Date.now() || typeof u !== "string") return null;
    return u;
  } catch {
    return null;
  }
}

// Who an export request is for: a valid ?t= token, or else the Clerk session.
export async function resolveExportUser(request: Request, kind: ExportKind) {
  const token = new URL(request.url).searchParams.get("t");
  if (token) return verifyExportToken(token, kind);
  const { userId } = await auth();
  return userId;
}
