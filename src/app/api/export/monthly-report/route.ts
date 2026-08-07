import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveStatsRange } from "@/lib/stats/range";
import { buildMonthlyReportWorkbook } from "@/lib/export";
import { requireCoreAccessApi } from "@/lib/entitlements";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const gate = await requireCoreAccessApi(userId);
  if (gate) return gate;

  const { searchParams } = new URL(request.url);
  const range = resolveStatsRange({ range: "month", date: searchParams.get("date") ?? undefined });
  const buffer = await buildMonthlyReportWorkbook(userId, range);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="monthly-report-${range.dateParam}.xlsx"`,
    },
  });
}
