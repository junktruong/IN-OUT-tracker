"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BillDTO } from "@/lib/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export default function BillsPage() {
  const [bills, setBills] = useState<BillDTO[]>([]);
  const [filter, setFilter] = useState<"all" | "unpaid">("all");
  const [form, setForm] = useState({
    name: "",
    amount: "",
    dueDay: "",
    group: "",
    start: "",
    end: "",
    note: "",
  });

  const loadBills = async () => {
    const response = await fetch("/api/bills");
    const data = await response.json();
    setBills(data.items ?? []);
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Tên khoản đóng là bắt buộc.");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Số tiền phải lớn hơn 0.");
      return;
    }
    const dueDay = Number(form.dueDay);
    if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
      toast.error("Ngày đóng phải từ 1-31.");
      return;
    }

    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        amount,
        dueDay,
        group: form.group || undefined,
        start: form.start || undefined,
        end: form.end || undefined,
        note: form.note || undefined,
      }),
    });

    toast.success("Đã lưu khoản đóng.");
    setForm({ name: "", amount: "", dueDay: "", group: "", start: "", end: "", note: "" });
    loadBills();
  };

  const handleTogglePaid = async (bill: BillDTO) => {
    await fetch(`/api/bills/${bill.id}/paid`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !bill.paid }),
    });
    loadBills();
  };

  const visibleBills = bills.filter((bill) => (filter === "unpaid" ? !bill.paid : true));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Khoản đóng theo tháng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Tên khoản đóng"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder="Số tiền"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            <Input
              placeholder="Ngày đến hạn (1-31)"
              value={form.dueDay}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDay: event.target.value }))}
            />
            <Input
              placeholder="Nhóm (tuỳ chọn)"
              value={form.group}
              onChange={(event) => setForm((prev) => ({ ...prev, group: event.target.value }))}
            />
            <Input
              type="date"
              value={form.start}
              onChange={(event) => setForm((prev) => ({ ...prev, start: event.target.value }))}
            />
            <Input
              type="date"
              value={form.end}
              onChange={(event) => setForm((prev) => ({ ...prev, end: event.target.value }))}
            />
            <Input
              className="md:col-span-2"
              placeholder="Ghi chú"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </div>
          <Button onClick={handleSubmit}>Lưu khoản đóng</Button>
        </CardContent>
      </Card>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | "unpaid")}
        className="space-y-4">
        <TabsList>
          <TabsTrigger value="unpaid">Chưa đóng</TabsTrigger>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
        </TabsList>
        <TabsContent value={filter}>
          <div className="space-y-3">
            {visibleBills.map((bill) => (
              <Card key={bill.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Đến hạn ngày {bill.dueDay} • {formatCurrency(bill.amount)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePaid(bill)}
                  >
                    {bill.paid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-rose-500" />
                    )}
                    {bill.paid ? "Đã đóng" : "Chưa đóng"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
