import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import UpdateChecker from "@/components/update-checker";
import InstallPrompt from "@/components/install-prompt";
import VersionBadge from "@/components/version-badge";
import ServiceWorkerCleanup from "@/components/service-worker-cleanup";
import { BearSplashScreen } from "@/components/bear-splash-screen";
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
    statusBarStyle: "black-translucent",
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
    <ClerkProvider>
      <html
        lang="zh-TW"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background pt-[env(safe-area-inset-top)] text-foreground">
          <ServiceWorkerCleanup />
          <UpdateChecker />
          {children}
          <InstallPrompt />
          <VersionBadge />
          <Toaster />
          {/* Last in the DOM so it wins any z-index tie with the update
              banner — while it's up, nothing else should show above it. */}
          <BearSplashScreen />
        </body>
      </html>
    </ClerkProvider>
  );
}
