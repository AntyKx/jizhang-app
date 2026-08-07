import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getExportTransactions, toWorkbookBuffer } from "@/lib/export";
import { todayInTaipeiString } from "@/lib/date";
import { requireCoreAccessApi } from "@/lib/entitlements";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const gate = await requireCoreAccessApi(userId);
  if (gate) return gate;

  const rows = await getExportTransactions(userId);
  const buffer = await toWorkbookBuffer(rows);
  const dateStr = todayInTaipeiString();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transactions-${dateStr}.xlsx"`,
    },
  });
}
