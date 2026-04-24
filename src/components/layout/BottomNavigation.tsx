"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Repeat, Settings, Wallet } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Tổng quan", icon: LayoutGrid },
  { href: "/bills", label: "Khoản đóng", icon: Repeat },
  { href: "/budgets", label: "Ngân sách", icon: Wallet },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export function BottomNavigation() {
  const pathname = usePathname();
  const { loading, user } = useAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-latte bg-white/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-xl grid-cols-4 gap-1 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors",
                active
                  ? "bg-honey/70 text-mocha shadow-sm shadow-amber-900/10"
                  : "text-caramel hover:bg-cream"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
