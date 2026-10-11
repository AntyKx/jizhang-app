"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { uiEvents } from "@/db/schema";
import { UI_EVENT_LABELS, type UiEventName } from "@/lib/analytics/ui-event-names";

// Fire-and-forget from the client. Silently ignores signed-out callers and
// unknown names — analytics must never surface an error to the user.
export async function logUiEvent(name: UiEventName) {
  if (!(name in UI_EVENT_LABELS)) return;
  const { userId } = await auth();
  if (!userId) return;
  try {
    await db.insert(uiEvents).values({ userId, name });
  } catch {
    // Swallow — a lost analytics row is fine.
  }
}
