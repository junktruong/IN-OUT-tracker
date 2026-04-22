"use client";

import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

const loginHref = (pathname: string) =>
  `/api/auth/google?returnTo=${encodeURIComponent(pathname || "/")}`;

export function AuthStatus() {
  const pathname = usePathname();
  const { loading, user, signOut } = useAuth();

  if (loading) {
    return <div className="h-9 w-full rounded-lg bg-muted md:w-28" />;
  }

  if (!user) {
    return (
      <Button asChild size="sm" className="w-full md:w-auto">
        <a href={loginHref(pathname)}>Đăng nhập</a>
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 text-sm md:w-auto md:flex-row md:items-center">
      <div className="min-w-0 text-muted-foreground md:text-right">
        <p className="truncate font-medium text-foreground">{user.name ?? user.email}</p>
        <p className="truncate text-xs">{user.email}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full md:w-auto"
        onClick={() => {
          void signOut();
        }}
      >
        Đăng xuất
      </Button>
    </div>
  );
}
