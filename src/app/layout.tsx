import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegistrar } from "@/components/app/PwaRegistrar";
import { AuthGate } from "@/components/auth/AuthGate";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { ToastProvider } from "@/components/shared/ToastProvider";
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
  title: "IN-OUT Tracker",
  description: "Theo dõi thu chi và kỳ lương",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IN-OUT Tracker",
  },
  icons: {
    icon: "/pwa-icon.svg",
    apple: "/pwa-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <PwaRegistrar />
          <div className="min-h-screen bg-cream text-mocha">
            <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-32">
              <AuthGate>{children}</AuthGate>
            </main>
            <BottomNavigation />
          </div>
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
