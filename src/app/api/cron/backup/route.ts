import { NextResponse } from "next/server";
import { del, list, put } from "@vercel/blob";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { buildBackup } from "@/lib/backup";
import { getTodayInTaipei } from "@/lib/date";
import { format, subDays } from "date-fns";

// A full pass builds one JSON per user; generous ceiling so a slow run
// doesn't get cut off halfway through the user list and silently skip
// whoever sorted last.
export const maxDuration = 300;

// How far back snapshots are kept. This single constant is the seam where
// free/paid retention tiers would later plug in (free keeps a week, paid
// keeps months) — until that exists, everyone gets the same window.
const RETENTION_DAYS = 30;

// Dated, deterministic path: re-running on the same day overwrites that
// day's snapshot rather than piling up duplicates, and the date is
// recoverable from the pathname alone, which is what the pruning below
// reads instead of trusting blob metadata.
function snapshotPath(userId: string, day: string) {
  return `backups/${userId}/${day}.json`;
}

function dayFromPath(pathname: string): string | null {
  const match = /\/(\d{4}-\d{2}-\d{2})\.json$/.exec(pathname);
  return match ? match[1] : null;
}

async function pruneOldSnapshots(userId: string, cutoffDay: string) {
  const { blobs } = await list({ prefix: `backups/${userId}/` });
  const expired = blobs.filter((b) => {
    const day = dayFromPath(b.pathname);
    return day !== null && day < cutoffDay;
  });
  if (expired.length === 0) return 0;
  await del(expired.map((b) => b.url));
  return expired.length;
}

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without this
  // check the endpoint would let anyone trigger a full scan of every user's
  // data on demand — refusing outright when the secret isn't configured
  // (rather than skipping the check) keeps a misconfigured deploy closed
  // instead of open.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = getTodayInTaipei();
  const day = format(today, "yyyy-MM-dd");
  const cutoffDay = format(subDays(today, RETENTION_DAYS), "yyyy-MM-dd");

  // Every real user has at least one account (getDefaultAccountId creates
  // one on first use), so this covers everyone with data worth snapshotting
  // without needing a separate users table.
  const userRows = await db.selectDistinct({ userId: accounts.userId }).from(accounts);

  let saved = 0;
  let pruned = 0;
  const failed: string[] = [];

  // Sequential, and each user isolated in its own try — one user's failure
  // (a corrupt row, a Blob hiccup) must not abort everyone else's snapshot,
  // which is exactly the failure mode that would leave the backup looking
  // healthy while quietly covering only half the users.
  for (const { userId } of userRows) {
    try {
      const backup = await buildBackup(userId);
      await put(snapshotPath(userId, day), JSON.stringify(backup), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      saved += 1;
      pruned += await pruneOldSnapshots(userId, cutoffDay);
    } catch (err) {
      console.error(`[cron/backup] failed for ${userId}:`, err);
      failed.push(userId);
    }
  }

  return NextResponse.json({ day, users: userRows.length, saved, pruned, failed });
}
