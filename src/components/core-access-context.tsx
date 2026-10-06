"use client";

import { createContext, useContext } from "react";

// Whether the signed-in user currently has core access (purchased, or inside
// the 7-day trial) — resolved once per request by the (app) layout via
// hasCoreAccess and handed down here, so client components deep in a form
// (e.g. SplitExpenseField, shared-ledger rows) can show their locked state
// without every caller threading a prop through. UI hint only: every gated
// server action still checks hasCoreAccess itself.
const CoreAccessContext = createContext(true);

export function CoreAccessProvider({ unlocked, children }: { unlocked: boolean; children: React.ReactNode }) {
  return <CoreAccessContext.Provider value={unlocked}>{children}</CoreAccessContext.Provider>;
}

export function useCoreUnlocked(): boolean {
  return useContext(CoreAccessContext);
}
