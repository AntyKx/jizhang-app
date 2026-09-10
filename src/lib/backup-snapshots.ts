import { del, get, list, put } from "@vercel/blob";
import { format, subDays } from "date-fns";

// How far back snapshots are kept, by plan. Restoring is free for everyone
// — what the core unlock buys is a longer window to reach back into, not
// the ability to recover at all. Shared by the cron job that prunes, the
// UI that explains the window, and the restore action that enforces it, so
// the promise shown to the user can't drift from what's actually retained.
export const FREE_RETENTION_DAYS = 7;
export const PAID_RETENTION_DAYS = 30;

export function retentionDaysFor(unlocked: boolean): number {
  return unlocked ? PAID_RETENTION_DAYS : FREE_RETENTION_DAYS;
}

// The oldest day still inside a plan's window, as a yyyy-MM-dd string.
// Restore checks against this rather than trusting that pruning has already
// run — a snapshot can outlive the window between nightly passes, or after
// a plan changes, and it shouldn't become reachable just because the
// cleanup hasn't caught up yet.
export function retentionCutoff(today: Date, unlocked: boolean): string {
  return format(subDays(today, retentionDaysFor(unlocked)), "yyyy-MM-dd");
}

// Dated, deterministic path: re-running on the same day overwrites that
// day's snapshot rather than piling up duplicates, and the date is
// recoverable from the pathname alone, which is what listing/pruning read
// instead of trusting blob metadata.
export function snapshotPath(userId: string, day: string) {
  return `backups/${userId}/${day}.json`;
}

export function dayFromPath(pathname: string): string | null {
  const match = /\/(\d{4}-\d{2}-\d{2})\.json$/.exec(pathname);
  return match ? match[1] : null;
}

export type Snapshot = { day: string; size: number };

// Newest first — the list is short by construction (one per day, capped by
// RETENTION_DAYS), so there's no pagination to worry about.
export async function listSnapshots(userId: string): Promise<Snapshot[]> {
  const { blobs } = await list({ prefix: `backups/${userId}/` });
  return blobs
    .map((b) => ({ day: dayFromPath(b.pathname), size: b.size }))
    .filter((s): s is Snapshot => s.day !== null)
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}

export async function writeSnapshot(userId: string, day: string, contents: string) {
  await put(snapshotPath(userId, day), contents, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// Pathname-addressed rather than URL-addressed so a caller can only ever
// reach the snapshot belonging to the userId it passed in — there's no way
// to hand this someone else's blob URL.
export async function readSnapshot(userId: string, day: string): Promise<string | null> {
  const result = await get(snapshotPath(userId, day), { access: "private" });
  // null = no such blob; statusCode 304 = not modified, which carries no
  // stream. Neither is an error worth throwing over — the caller turns a
  // null into "找不到這一天的備份".
  if (!result || result.statusCode !== 200) return null;
  return await new Response(result.stream).text();
}

export async function pruneSnapshots(userId: string, cutoffDay: string): Promise<number> {
  const { blobs } = await list({ prefix: `backups/${userId}/` });
  const expired = blobs.filter((b) => {
    const day = dayFromPath(b.pathname);
    return day !== null && day < cutoffDay;
  });
  if (expired.length === 0) return 0;
  await del(expired.map((b) => b.url));
  return expired.length;
}
