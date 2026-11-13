import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { zhTW } from "@clerk/localizations";
import { Toaster } from "@/components/ui/sonner";
import UpdateChecker from "@/components/update-checker";
import InstallPrompt from "@/components/install-prompt";
import VersionBadge from "@/components/version-badge";
import ServiceWorkerCleanup from "@/components/service-worker-cleanup";
import { BearSplashScreen } from "@/components/bear-splash-screen";
import { GestureLock } from "@/components/gesture-lock";
import { NativeAuthListener } from "@/components/native-auth-listener";
import { NativePurchasesInit } from "@/components/native-purchases-init";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小熊記帳本",
  description: "AI 輔助智慧記帳",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    // "default" (opaque bar, page starts below it), not "black-translucent":
    // iOS 27 home-screen web apps blur whatever is drawn under the status
    // bar and a bit past it, which smeared the home greeting; pushing the
    // content down 1rem wasn't enough. Android (Capacitor) ignores this.
    statusBarStyle: "default",
    title: "小熊記帳本",
  },
};

export const viewport: Viewport = {
  themeColor: "#e2874f",
  width: "device-width",
  initialScale: 1,
  // Reverted maximumScale/userScalable — on iPhones with a Dynamic Island,
  // disabling zoom alongside viewport-fit=cover breaks the safe-area
  // calculation (a known WebKit interaction, not a screen-size thing),
  // shoving content up under the status bar/island on every page, not
  // just wherever the zoom lock itself was needed. Not worth it for a
  // "can't pinch-zoom" convenience.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={zhTW}>
      <html
        lang="zh-TW"
        className={`${geistSans.variable} ${geistMono.variable} h-[100dvh] antialiased`}
        // next-themes sets class="dark" on <html> before hydration.
        suppressHydrationWarning
      >
        <body className="min-h-[100dvh] flex flex-col bg-background pt-[env(safe-area-inset-top)] text-foreground">
          {/* Light by default — dark is opt-in from 帳號設定 → 外觀. */}
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {/* iOS 27 frosts the top of installed web apps when the status bar
              is translucent (WebKit bug 325807). The statusBarStyle switch
              above only reaches fresh installs — iOS keeps the style an app
              was added with — so for existing installs a solid fixed strip
              behind the status bar is the other known way to stop the blur.
              Zero-height wherever the safe area is 0 (opaque bar, desktop). */}
          <div aria-hidden className="ios-status-strip pointer-events-none fixed inset-x-0 top-0 z-[60] h-[env(safe-area-inset-top)] bg-background" />
          <ServiceWorkerCleanup />
          <UpdateChecker />
          <GestureLock />
          <NativeAuthListener />
          <NativePurchasesInit />
          {children}
          <InstallPrompt />
          <VersionBadge />
          <Toaster />
          {/* Last in the DOM so it wins any z-index tie with the update
              banner — while it's up, nothing else should show above it. */}
          <BearSplashScreen />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
