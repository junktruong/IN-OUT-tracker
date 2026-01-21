import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
        <div className="min-h-screen bg-muted/40">
          <header className="border-b bg-background">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
              <div>
                <p className="text-lg font-semibold">IN-OUT Tracker</p>
                <p className="text-xs text-muted-foreground">
                  Quản lý thu chi theo tháng
                </p>
              </div>
              <nav className="flex items-center gap-4 text-sm">
                <Link className="text-muted-foreground hover:text-foreground" href="/">
                  Dashboard
                </Link>
                <Link className="text-muted-foreground hover:text-foreground" href="/bills">
                  Khoản đóng
                </Link>
                <Link className="text-muted-foreground hover:text-foreground" href="/settings">
                  Cài đặt
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-8">
            {children}
          </main>
        </div>
        <ToastProvider />
      </body>
    </html>
  );
}
