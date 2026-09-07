// Server actions return this instead of throwing for *expected*, user-facing
// failures (invalid input, a record that's missing or not owned by the
// caller, a business-rule violation like "already settled"). A thrown
// Error's message gets redacted by React's Flight protocol in production by
// default (an anti-leak security measure that treats a Server Action's
// error the same as a Server Component render error) — so a deliberately
// friendly validation message never actually reaches the client if it's
// thrown; the client only ever sees a generic "Server Components render"
// message with no detail. Returning the message as data sidesteps that
// entirely, since returned data is never redacted.
//
// Actions still throw for genuinely unexpected failures (a DB outage, a
// bug) — those should stay opaque to the client rather than risk leaking
// internals, so don't wrap every call in try/catch to convert this; only
// the specific validation checks that used to `throw new Error(msg)` should
// become `return fail(msg)`.
export type Fail = { error: string };

export function fail(error: string): Fail {
  return { error };
}

// Works for both a data-returning action (`{ id: string } | Fail`, checked
// via `"error" in result`-style narrowing) and a void one (`undefined |
// Fail`, where a plain `result?.error` check already reads fine) — this
// helper is for call sites that want one consistent check either way.
export function isFail(result: unknown): result is Fail {
  return typeof result === "object" && result !== null && "error" in result;
}
