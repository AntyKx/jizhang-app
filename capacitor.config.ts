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
    // "dev browser" handshake through their own accounts.dev host, which
    // Android's WebView refuses to complete inline and kicks out to the
    // system browser instead. Moving to this custom domain + Clerk's
    // production instance (pk_live_*) puts Clerk's Frontend API on
    // clerk.bearledger.app — same registrable domain, no handshake, no
    // escape to the external browser.
    url: "https://jizhang.bearledger.app",
    cleartext: false,
  },
};

export default config;
