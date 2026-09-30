import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Mints a short-lived Clerk sign-in token for the currently authenticated
// browser session. Used only by src/app/native-auth-callback: after the
// Android app hands Google/Clerk OAuth off to Chrome Custom Tabs (see
// MainActivity's shouldOverrideUrlLoading override), the resulting session
// lives in Chrome's cookie jar, not the app's WebView. This token is how
// that session gets carried back across — the callback page redirects to a
// bearledger:// deep link with the token, and the WebView completes sign-in
// with Clerk's "ticket" strategy.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const signInToken = await client.signInTokens.createSignInToken({
    userId,
    // Generous relative to how short-lived this token needs to be: it still
    // has to survive the deep-link handoff back into the app, and — if
    // Android killed the app process while the user was in Chrome Custom
    // Tabs — a full cold start (WebView boot + Clerk SDK re-handshake) on
    // top of that, which older/slower tester devices can genuinely take a
    // while to clear.
    expiresInSeconds: 180,
  });

  return NextResponse.json({ token: signInToken.token });
}
