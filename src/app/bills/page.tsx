"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BillDTO } from "@/lib/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export default function BillsPage() {
  const [bills, setBills] = useState<BillDTO[]>([]);
  const [filter, setFilter] = useState<"all" | "unpaid">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    dueDay: "",
    group: "",
    start: "",
    end: "",
    note: "",
  });
  const [payingBill, setPayingBill] = useState<BillDTO | null>(null);
  const [payForm, setPayForm] = useState({
    paidAt: "",
    paidAmount: "",
    paidNote: "",
  });

  const fetchBills = useCallback(async () => {
    const response = await fetch("/api/bills");
    if (!response.ok) {
      throw new Error("Không thể tải khoản đóng.");
    }
    const data = await response.json();
    return (data.items ?? []) as BillDTO[];
  }, []);

  const loadBills = useCallback(async () => {
    setBills(await fetchBills());
  }, [fetchBills]);

  useEffect(() => {
    let ignore = false;

    const loadInitialBills = async () => {
      const items = await fetchBills();
      if (!ignore) {
        setBills(items);
      }
    };

    void loadInitialBills();

    return () => {
      ignore = true;
    };
  }, [fetchBills]);

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
    if (form.start && form.end) {
      const startDate = new Date(`${form.start}T00:00:00`);
      const endDate = new Date(`${form.end}T00:00:00`);
      if (startDate > endDate) {
        toast.error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
        return;
      }
    }

    const response = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId ?? undefined,
        name: form.name,
        amount,
        dueDay,
        group: form.group || undefined,
        start: form.start || undefined,
        end: form.end || undefined,
        note: form.note || undefined,
      }),
    });

    if (!response.ok) {
      toast.error("Không thể lưu khoản đóng.");
      return;
    }

    toast.success("Đã lưu khoản đóng.");
    setForm({ name: "", amount: "", dueDay: "", group: "", start: "", end: "", note: "" });
    setEditingId(null);
    void loadBills();
  };

  const handleEdit = (bill: BillDTO) => {
    setEditingId(bill.id);
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      dueDay: String(bill.dueDay),
      group: bill.group ?? "",
      start: bill.start ?? "",
      end: bill.end ?? "",
      note: bill.note ?? "",
    });
  };

  const handleDelete = async (bill: BillDTO) => {
    const confirmed = window.confirm(`Xoá khoản đóng "${bill.name}"?`);
    if (!confirmed) {
      return;
    }
    const response = await fetch(`/api/bills/${bill.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Không thể xoá khoản đóng.");
      return;
    }
    toast.success("Đã xoá khoản đóng.");
    void loadBills();
  };

  const openPayDialog = (bill: BillDTO) => {
    setPayingBill(bill);
    const today = new Date().toISOString().slice(0, 10);
    setPayForm({
      paidAt: today,
      paidAmount: bill.amount ? String(bill.amount) : "",
      paidNote: bill.paidNote ?? "",
    });
  };

  const handleConfirmPay = async () => {
    if (!payingBill) {
      return;
    }
    if (!payForm.paidAt) {
      toast.error("Vui lòng chọn ngày đóng.");
      return;
    }
    const paidAmount = payForm.paidAmount.trim() ? Number(payForm.paidAmount) : undefined;
    if (paidAmount !== undefined && (!Number.isFinite(paidAmount) || paidAmount <= 0)) {
      toast.error("Số tiền đã đóng phải lớn hơn 0.");
      return;
    }
    const payload = {
      paidAt: payForm.paidAt,
      paidAmount,
      paidNote: payForm.paidNote || undefined,
    };
    const response = await fetch(`/api/bills/${payingBill.id}/pay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      toast.error("Không thể xác nhận đã đóng.");
      return;
    }
    toast.success("Đã xác nhận đóng.");
    setPayingBill(null);
    void loadBills();
  };

  const handleUnpay = async (bill: BillDTO) => {
    const response = await fetch(`/api/bills/${bill.id}/unpay`, {
      method: "PATCH",
    });
    if (!response.ok) {
      toast.error("Không thể hoàn tác.");
      return;
    }
    toast.success("Đã hoàn tác.");
    void loadBills();
  };

  const visibleBills = bills.filter((bill) => (filter === "unpaid" ? !bill.paid : true));

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Khoản đóng theo tháng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Tên khoản đóng"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Số tiền"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            <Input
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
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
              className="sm:col-span-2"
              placeholder="Ghi chú"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </div>
          <Button className="w-full sm:w-auto" onClick={handleSubmit}>Lưu khoản đóng</Button>
        </CardContent>
      </Card>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as "all" | "unpaid")}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:w-auto sm:gap-0">
          <TabsTrigger value="unpaid">Chưa đóng</TabsTrigger>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
        </TabsList>
        <TabsContent value={filter}>
          <div className="space-y-3">
            {visibleBills.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Không có khoản đóng phù hợp.
                </CardContent>
              </Card>
            ) : (
              visibleBills.map((bill) => (
                <Card key={bill.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">{bill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Đến hạn ngày {bill.dueDay} • {formatCurrency(bill.amount)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={() => handleEdit(bill)}>
                        Sửa
                      </Button>
                      <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={() => handleDelete(bill)}>
                        Xoá
                      </Button>
                      {bill.paid ? (
                        <Button className="col-span-2 w-full sm:w-auto" size="sm" variant="outline" onClick={() => handleUnpay(bill)}>
                          Hoàn tác
                        </Button>
                      ) : (
                        <Button className="col-span-2 w-full sm:w-auto" size="sm" variant="outline" onClick={() => openPayDialog(bill)}>
                          Xác nhận đã đóng
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!payingBill} onOpenChange={(open) => !open && setPayingBill(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Xác nhận đã đóng</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              type="date"
              value={payForm.paidAt}
              onChange={(event) => setPayForm((prev) => ({ ...prev, paidAt: event.target.value }))}
            />
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Số tiền đã đóng"
              value={payForm.paidAmount}
              onChange={(event) =>
                setPayForm((prev) => ({ ...prev, paidAmount: event.target.value }))
              }
            />
            <Input
              placeholder="Ghi chú"
              value={payForm.paidNote}
              onChange={(event) => setPayForm((prev) => ({ ...prev, paidNote: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" onClick={handleConfirmPay}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
