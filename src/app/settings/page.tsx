"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SettingsDTO } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsDTO>({ paydayDay: 25, salaryExpected: 0 });

  const fetchSettings = useCallback(async () => {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      throw new Error("Không thể tải cài đặt.");
    }
    const data = await response.json();
    return data as SettingsDTO;
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadInitialSettings = async () => {
      const data = await fetchSettings();
      if (!ignore) {
        setSettings(data);
      }
    };

    void loadInitialSettings();

    return () => {
      ignore = true;
    };
  }, [fetchSettings]);

  const handleSave = async () => {
    if (settings.paydayDay < 1 || settings.paydayDay > 31) {
      toast.error("Ngày lương phải từ 1-31.");
      return;
    }
    if (!Number.isFinite(settings.salaryExpected) || settings.salaryExpected < 0) {
      toast.error("Lương dự kiến phải lớn hơn hoặc bằng 0.");
      return;
    }
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      toast.error("Không thể lưu cài đặt.");
      return;
    }
    toast.success("Đã lưu cài đặt.");
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>Cài đặt kỳ lương</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            value={settings.paydayDay}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                paydayDay: Number(event.target.value),
              }))
            }
            placeholder="Ngày lương (1-31)"
          />
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={settings.salaryExpected}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                salaryExpected: Number(event.target.value),
              }))
            }
            placeholder="Lương dự kiến"
          />
        </div>
        <Button className="w-full sm:w-auto" onClick={handleSave}>Lưu cài đặt</Button>
      </CardContent>
    </Card>
  );
}
