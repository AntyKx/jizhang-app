import { db } from "@/db";
import { uiEvents } from "@/db/schema";
import type { UiEventName } from "@/lib/analytics/ui-event-names";

// Server-side counterpart to track(): for failures only the API route sees
// (a model/gateway error), so /admin can show who hit them. Never throws.
export async function logServerEvent(userId: string, name: UiEventName, detail?: unknown) {
  console.error(name, detail instanceof Error ? detail.message : (detail ?? ""));
  try {
    await db.insert(uiEvents).values({ userId, name });
  } catch {
    // A lost analytics row is fine.
  }
}
