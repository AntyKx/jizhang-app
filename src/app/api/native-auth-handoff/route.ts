import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Where the Chrome-side Google sign-in (src/app/native-google-sign-in) lands
// once Clerk has created the session. Mints the sign-in ticket and redirects
// straight to the App Link in one server round-trip — no page to load and no
// Clerk JS to boot (what /native-auth-callback does client-side), which was
// a whole extra page load in the hand-off. A server redirect that continues
// the user's own navigation chain is also what Chrome is most willing to hand
// to an installed app, unlike a script-initiated navigation.
//
// The ticket rides in the fragment, which browsers keep across redirects but
// never send to a server — see src/app/native-auth-return.
const NATIVE_AUTH_RETURN_URL = "https://bearledger.app/native-auth-return";

export async function GET(req: Request) {
  const { userId, sessionId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/native-google-sign-in", req.url));
  }

  const client = await clerkClient();
  const signInToken = await client.signInTokens.createSignInToken({
    userId,
    // Same window as /api/native-auth-ticket — see that route's comment.
    expiresInSeconds: 180,
  });

  // The app gets its own session from the ticket; the one Chrome holds was
  // only ever a stepping stone. Leaving it signed in made the next Google
  // sign-in from this device start out "already signed in" (and stuck on
  // whichever account was used last), so end it here.
  if (sessionId) {
    await client.sessions.revokeSession(sessionId).catch(() => {});
  }

  const res = NextResponse.redirect(`${NATIVE_AUTH_RETURN_URL}#ticket=${encodeURIComponent(signInToken.token)}`, 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
