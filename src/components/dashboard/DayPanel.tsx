"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TransactionDTO } from "@/lib/types";

export type DayPanelProps = {
  dayKey: string;
  items: TransactionDTO[];
  daySummary: { income: number; expense: number; net: number };
  onQuickAdd: (raw: string) => Promise<{ added: number; skipped: string[] }>;
  onReload: () => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function DayPanel({ dayKey, items, daySummary, onQuickAdd, onReload }: DayPanelProps) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);

  const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const handleSubmit = async () => {
    if (!raw.trim()) {
      toast.error("Vui lòng nhập nội dung.");
      return;
    }
    setLoading(true);
    try {
      const result = await onQuickAdd(raw);
      setRaw("");
      toast.success(`Đã thêm ${result.added} dòng, bỏ qua ${result.skipped.length} dòng.`);
      onReload();
    } catch (error) {
      toast.error("Không thể thêm giao dịch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{dayKey}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-4 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Ra</p>
            <p className="mt-1 text-base font-semibold text-rose-600">
              {formatCurrency(daySummary.expense)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Vào</p>
            <p className="mt-1 text-base font-semibold text-emerald-600">
              {formatCurrency(daySummary.income)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Ròng</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatCurrency(daySummary.net)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Quick input</p>
          <Textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder={`phở 45k; cafe 25k\n[Đi lại] Grab 70k @Grab\n+ [Lương] 15000000 @Công ty`}
            className="min-h-[120px]"
          />
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang thêm..." : "Thêm"}
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Giao dịch trong ngày</p>
          <div className="space-y-3">
            {sorted.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-xl border bg-background px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${
                      item.type === "income" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  >
                    {item.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {item.desc} — {formatCurrency(item.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} {item.source ? `• ${item.source}` : ""}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
