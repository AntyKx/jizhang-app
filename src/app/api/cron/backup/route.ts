import { NextResponse } from "next/server";
import { format } from "date-fns";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { hasCoreAccess } from "@/lib/entitlements";
import { buildBackup } from "@/lib/backup";
import { pruneSnapshots, retentionCutoff, writeSnapshot } from "@/lib/backup-snapshots";
import { getTodayInTaipei } from "@/lib/date";

// A full pass builds one JSON per user; generous ceiling so a slow run
// doesn't get cut off halfway through the user list and silently skip
// whoever sorted last.
export const maxDuration = 300;

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
      await writeSnapshot(userId, day, JSON.stringify(backup));
      saved += 1;
      // Snapshots are taken for everyone; only how long they're kept
      // depends on the plan. Pruning reads the entitlement per user so a
      // plan change takes effect on the next nightly pass without needing
      // any migration of what's already stored.
      pruned += await pruneSnapshots(userId, retentionCutoff(today, await hasCoreAccess(userId)));
    } catch (err) {
      console.error(`[cron/backup] failed for ${userId}:`, err);
      failed.push(userId);
    }
  }

  return NextResponse.json({ day, users: userRows.length, saved, pruned, failed });
}
