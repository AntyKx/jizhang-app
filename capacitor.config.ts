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
    url: "https://jizhang-app-sand.vercel.app",
    cleartext: false,
  },
};

export default config;
