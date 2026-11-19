"use client";

import { createContext, useContext } from "react";

// Whether the signed-in user currently has core access (purchased, or inside
// the one-time trial) — resolved once per request by the (app) layout via
// hasCoreAccess and handed down here, so client components deep in a form
// (e.g. SplitExpenseField, shared-ledger rows) can show their locked state
// without every caller threading a prop through. UI hint only: every gated
// server action still checks hasCoreAccess itself.
const CoreAccessContext = createContext({ unlocked: true, trialing: false });

export function CoreAccessProvider({
  unlocked,
  trialing,
  children,
}: {
  unlocked: boolean;
  // Unlocked only by the trial (not purchased) — for "after the trial…" notes.
  trialing: boolean;
  children: React.ReactNode;
}) {
  return <CoreAccessContext.Provider value={{ unlocked, trialing }}>{children}</CoreAccessContext.Provider>;
}

export function useCoreUnlocked(): boolean {
  return useContext(CoreAccessContext).unlocked;
}

export function useCoreTrialing(): boolean {
  return useContext(CoreAccessContext).trialing;
}
