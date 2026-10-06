import type { CapacitorConfig } from "@capacitor/cli";

// This app is a live Next.js server (auth, API routes, DB) — it can't be
// statically exported into the native bundle like a typical Capacitor app.
// The native shell just loads the deployed production site in a WebView, so
// `server.url` points there instead of bundling `webDir` as the app itself.
const config: CapacitorConfig = {
  appId: "com.anty.jizhang",
  appName: "小熊記帳本",
  webDir: "public",
  server: {
    // Clerk's dev instances (pk_test_* keys) needed a cross-domain
    // "dev browser" handshake through their own accounts.dev host. Moving to
    // this custom domain + Clerk's production instance (pk_live_*) puts
    // Clerk's Frontend API on clerk.bearledger.app.
    url: "https://jizhang.bearledger.app",
    cleartext: false,
    // The production instance still does a handshake: whenever the WebView
    // has a stale session cookie (e.g. a cold start after the short-lived
    // session token expired), Next.js middleware redirects the page load to
    // clerk.bearledger.app/v1/client/handshake, which bounces straight back.
    // Capacitor sends any main-frame navigation to a host not listed here to
    // the external browser — which threw users out of the app into Chrome
    // showing the sign-in page. Allowing it keeps the handshake in the
    // WebView; MainActivity's shouldOverrideUrlLoading still runs first and
    // hands the actual OAuth hops on this host to Chrome Custom Tabs.
    allowNavigation: ["clerk.bearledger.app"],
  },
};

export default config;
