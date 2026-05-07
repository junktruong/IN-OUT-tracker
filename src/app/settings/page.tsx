"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { InstallPwaButton } from "@/components/app/InstallPwaButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSettingsLocalFirst } from "@/hooks/useSettingsLocalFirst";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SettingsDTO } from "@/lib/types";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { settings, loading, syncState, saveSettings } = useSettingsLocalFirst();
  const [draft, setDraft] = useState<SettingsDTO>({ paydayDay: 25, salaryExpected: 0 });

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const syncMessage = useMemo(() => {
    if (syncState.syncing) {
      return "Đang đồng bộ cài đặt với server...";
    }
    if (syncState.lastError) {
      return `Đang chờ đồng bộ lại: ${syncState.lastError}`;
    }
    if (syncState.pendingCount > 0) {
      return `Còn ${syncState.pendingCount} thay đổi đang chờ đồng bộ.`;
    }
    return "Cài đặt đã được lưu trên máy và đồng bộ xong.";
  }, [syncState]);

  const handleSave = async () => {
    if (draft.paydayDay < 1 || draft.paydayDay > 31) {
      toast.error("Ngày lương phải từ 1-31.");
      return;
    }
    if (!Number.isFinite(draft.salaryExpected) || draft.salaryExpected < 0) {
      toast.error("Lương dự kiến phải lớn hơn hoặc bằng 0.");
      return;
    }

    try {
      await saveSettings({
        paydayDay: draft.paydayDay,
        salaryExpected: draft.salaryExpected,
      });
      toast.success(
        typeof navigator !== "undefined" && navigator.onLine
          ? "Đã lưu cài đặt. App sẽ đồng bộ ngay."
          : "Đã lưu cài đặt trên máy. Có mạng lại app sẽ tự đồng bộ."
      );
    } catch {
      toast.error("Không thể lưu cài đặt.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="rounded-3xl border border-latte bg-white shadow-sm shadow-amber-900/5">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-lg text-mocha">Tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4 pt-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-honey/70 text-base font-semibold text-mocha">
              {user?.name?.charAt(0) ?? user?.email?.charAt(0) ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-mocha">
                {user?.name ?? user?.email}
              </p>
              <p className="truncate text-xs text-caramel">{user?.email}</p>
            </div>
          </div>
          <Button
            className="w-full rounded-full sm:w-auto"
            variant="outline"
            onClick={() => {
              void signOut();
            }}
          >
            Đăng xuất
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-latte bg-white shadow-sm shadow-amber-900/5">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-lg text-mocha">Ứng dụng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <InstallPwaButton />
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-latte bg-white shadow-sm shadow-amber-900/5">
        <CardHeader className="p-4">
          <CardTitle className="text-lg text-mocha">Cài đặt kỳ lương</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              value={draft.paydayDay}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  paydayDay: Number(event.target.value),
                }))
              }
              placeholder="Ngày lương (1-31)"
              className="h-11 rounded-2xl"
            />
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.salaryExpected}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  salaryExpected: Number(event.target.value),
                }))
              }
              placeholder="Lương dự kiến"
              className="h-11 rounded-2xl"
            />
          </div>
          <p className="text-xs text-caramel">{syncMessage}</p>
          <Button
            className="w-full rounded-full sm:w-auto"
            onClick={handleSave}
            disabled={loading}
          >
            Lưu cài đặt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
