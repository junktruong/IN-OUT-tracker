import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AuthGate } from "@/components/auth/AuthGate";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthStatus } from "@/components/auth/AuthStatus";
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
          <div className="min-h-screen bg-cream text-mocha">
            <header className="border-b border-latte bg-white/90 shadow-sm shadow-amber-900/5 backdrop-blur">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-mocha">IN-OUT Tracker</p>
                  <p className="text-xs text-caramel">
                    Quản lý thu chi theo tháng
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:gap-5">
                  <nav className="grid w-full grid-cols-3 gap-2 text-sm md:w-auto md:flex md:items-center md:gap-4">
                    <Link className="rounded-lg px-3 py-2 text-center text-caramel hover:bg-cream hover:text-mocha md:px-0 md:py-0 md:text-left md:hover:bg-transparent" href="/">
                      Dashboard
                    </Link>
                    <Link className="rounded-lg px-3 py-2 text-center text-caramel hover:bg-cream hover:text-mocha md:px-0 md:py-0 md:text-left md:hover:bg-transparent" href="/bills">
                      Khoản đóng
                    </Link>
                    <Link className="rounded-lg px-3 py-2 text-center text-caramel hover:bg-cream hover:text-mocha md:px-0 md:py-0 md:text-left md:hover:bg-transparent" href="/settings">
                      Cài đặt
                    </Link>
                  </nav>
                  <AuthStatus />
                </div>
              </div>
            </header>
            <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
              <AuthGate>{children}</AuthGate>
            </main>
          </div>
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
