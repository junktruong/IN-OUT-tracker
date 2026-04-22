"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const loginHref = (pathname: string) =>
  `/api/auth/google?returnTo=${encodeURIComponent(pathname || "/")}`;

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Đang kiểm tra đăng nhập...
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader className="p-5">
          <CardTitle>Đăng nhập để dùng IN-OUT Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0 text-sm text-muted-foreground">
          <p>Dữ liệu thu chi sẽ được lưu riêng theo tài khoản Google của bạn.</p>
          <Button asChild className="w-full">
            <a href={loginHref(pathname)}>Đăng nhập bằng Google</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
