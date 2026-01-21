"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SettingsDTO } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsDTO>({ paydayDay: 25, salaryExpected: 0 });

  const loadSettings = async () => {
    const response = await fetch("/api/settings");
    const data = await response.json();
    setSettings(data);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (settings.paydayDay < 1 || settings.paydayDay > 31) {
      toast.error("Ngày lương phải từ 1-31.");
      return;
    }
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    toast.success("Đã lưu cài đặt.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt kỳ lương</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            type="number"
            min={1}
            max={31}
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
        <Button onClick={handleSave}>Lưu cài đặt</Button>
      </CardContent>
    </Card>
  );
}
