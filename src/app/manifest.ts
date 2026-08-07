import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "小熊記帳本",
    short_name: "小熊記帳本",
    description: "AI 輔助智慧記帳",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f0",
    theme_color: "#e2874f",
    lang: "zh-TW",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home screen icon to jump straight into an input sheet
    // instead of landing on the app and navigating there — closest thing to
    // a home-screen widget a PWA can offer without going native.
    shortcuts: [
      {
        name: "快速記帳",
        url: "/record?action=quickadd",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "拍照記帳",
        url: "/record?action=scan",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
