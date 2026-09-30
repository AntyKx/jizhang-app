import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/version",
  "/terms",
  "/privacy",
  "/api/webhooks/stripe",
  // Called by RevenueCat, which has no Clerk session — "public" to this
  // middleware only. The route itself is not open: it requires a valid
  // HMAC signature (REVENUECAT_WEBHOOK_SECRET) and refuses outright when
  // that env var is missing.
  "/api/webhooks/revenuecat",
  // Called by Vercel Cron, which has no Clerk session — "public" to this
  // middleware only. The route itself is not open: it requires a Bearer
  // CRON_SECRET and refuses outright when that env var is missing.
  "/api/cron(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Clerk's default protect() only redirects to sign-in when the request
    // "looks like" a browser page load (Sec-Fetch-Dest: document, or an
    // Accept header containing text/html) — anything else, including plain
    // bots/crawlers like Google Play's account/data-deletion URL checker,
    // falls through to a bare 404 instead. Pinning unauthenticatedUrl makes
    // every unauthenticated request redirect the same way regardless of
    // what client sent it.
    await auth.protect({ unauthenticatedUrl: new URL("/sign-in", req.url).toString() });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
