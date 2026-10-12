import { NextResponse } from "next/server";
import { resolveExportUser } from "@/lib/export-link";
import { getExportTransactions, toCsv } from "@/lib/export";
import { todayInTaipeiString } from "@/lib/date";
import { requireCoreAccessApi } from "@/lib/entitlements";

export async function GET(request: Request) {
  const userId = await resolveExportUser(request, "csv");
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const gate = await requireCoreAccessApi(userId);
  if (gate) return gate;

  const rows = await getExportTransactions(userId);
  const csv = toCsv(rows);
  const dateStr = todayInTaipeiString();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${dateStr}.csv"`,
    },
  });
}
