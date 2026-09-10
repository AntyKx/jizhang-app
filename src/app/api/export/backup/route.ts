import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildBackup } from "@/lib/backup";

// Deliberately not gated by requireCoreAccessApi — downloading a copy of
// your own data is a data-subject right, not a paid feature (see
// deleteAllUserData()'s comment, and /terms' recommendation that users back
// up via this page, which would be a broken promise for free users if this
// were paywalled). Only restoreBackup() (the destructive, replace-style
// operation) stays behind the core-unlock gate.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const backup = await buildBackup(userId);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="jizhang-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
