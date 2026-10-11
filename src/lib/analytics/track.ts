"use client";

import { logUiEvent } from "@/lib/analytics/actions";
import type { UiEventName } from "@/lib/analytics/ui-event-names";

// Never awaited, never throws — call it inline in event handlers.
export function track(name: UiEventName) {
  void logUiEvent(name).catch(() => {});
}
