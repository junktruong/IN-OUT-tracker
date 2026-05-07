"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useBillsLocalFirst } from "@/hooks/useBillsLocalFirst";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toYmd } from "@/lib/domain/date";
import type { BillCycleType } from "@/lib/domain/bills";
import type { BillDTO } from "@/lib/types";

const formatCurrency = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

const cycleOptions: Array<{ value: BillCycleType; label: string }> = [
  { value: "monthly", label: "Hàng tháng" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "custom_days", label: "Tuỳ chỉnh" },
];

const weekdayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const emptyForm = {
  name: "",
  amount: "",
  cycleType: "monthly" as BillCycleType,
  cycleValue: "25",
  group: "",
  start: "",
  end: "",
  note: "",
};

const cycleLabel = (bill: Pick<BillDTO, "cycleType" | "cycleValue">) => {
  if (bill.cycleType === "weekly") {
    return `Hàng tuần • ${weekdayLabels[bill.cycleValue - 1] ?? "Thứ 2"}`;
  }

  if (bill.cycleType === "custom_days") {
    return `Mỗi ${bill.cycleValue} ngày`;
  }

  return `Hàng tháng • ngày ${bill.cycleValue}`;
};

export default function BillsPage() {
  const {
    items: bills,
    loading,
    syncState,
    saveBill,
    removeBill,
    confirmBillPaid,
    undoBillPaid,
  } = useBillsLocalFirst();
  const [filter, setFilter] = useState<"all" | "unpaid">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [payingBill, setPayingBill] = useState<BillDTO | null>(null);
  const [confirmingPay, setConfirmingPay] = useState(false);

  const syncMessage = useMemo(() => {
    if (syncState.syncing) {
      return "Đang đồng bộ các khoản đóng với server...";
    }
    if (syncState.lastError) {
      return `Đang chờ đồng bộ lại: ${syncState.lastError}`;
    }
    if (syncState.pendingCount > 0) {
      return `Còn ${syncState.pendingCount} thay đổi đang chờ đồng bộ.`;
    }
    return "Khoản đóng đã được lưu trên máy và đồng bộ xong.";
  }, [syncState]);

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
    const cycleValue = Number(form.cycleValue);
    if (!Number.isFinite(cycleValue) || cycleValue <= 0) {
      toast.error("Chu kỳ không hợp lệ.");
      return;
    }
    if (form.cycleType === "monthly" && (cycleValue < 1 || cycleValue > 31)) {
      toast.error("Ngày đóng hàng tháng phải từ 1-31.");
      return;
    }
    if (form.cycleType === "weekly" && (cycleValue < 1 || cycleValue > 7)) {
      toast.error("Ngày trong tuần phải hợp lệ.");
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

    try {
      await saveBill(
        {
          id: editingId ?? undefined,
          name: form.name,
          amount,
          cycleType: form.cycleType,
          cycleValue,
          group: form.group || undefined,
          start: form.start || undefined,
          end: form.end || undefined,
          note: form.note || undefined,
        },
        editingId ?? undefined
      );
      toast.success(
        typeof navigator !== "undefined" && navigator.onLine
          ? "Đã lưu khoản đóng. App sẽ đồng bộ ngay."
          : "Đã lưu khoản đóng trên máy. Có mạng lại app sẽ tự đồng bộ."
      );
      setForm(emptyForm);
      setEditingId(null);
    } catch {
      toast.error("Không thể lưu khoản đóng.");
    }
  };

  const handleEdit = (bill: BillDTO) => {
    setEditingId(bill.id);
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      cycleType: bill.cycleType,
      cycleValue: String(bill.cycleValue),
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

    try {
      await removeBill(bill);
      toast.success(
        typeof navigator !== "undefined" && navigator.onLine
          ? "Đã xoá khoản đóng. App sẽ đồng bộ ngay."
          : "Đã xoá khoản đóng trên máy. Có mạng lại app sẽ tự đồng bộ."
      );
    } catch {
      toast.error("Không thể xoá khoản đóng.");
    }
  };

  const handleConfirmPay = async () => {
    if (!payingBill) {
      return;
    }

    setConfirmingPay(true);
    try {
      await confirmBillPaid(payingBill, {
        paidAt: toYmd(new Date()),
        paidAmount: payingBill.amount,
      });
      toast.success(
        typeof navigator !== "undefined" && navigator.onLine
          ? "Đã xác nhận đóng. App sẽ đồng bộ ngay."
          : "Đã xác nhận trên máy. Có mạng lại app sẽ tự đồng bộ."
      );
      setPayingBill(null);
    } catch {
      toast.error("Không thể xác nhận đã đóng.");
    } finally {
      setConfirmingPay(false);
    }
  };

  const handleUnpay = async (bill: BillDTO) => {
    try {
      await undoBillPaid(bill);
      toast.success(
        typeof navigator !== "undefined" && navigator.onLine
          ? "Đã hoàn tác. App sẽ đồng bộ ngay."
          : "Đã hoàn tác trên máy. Có mạng lại app sẽ tự đồng bộ."
      );
    } catch {
      toast.error("Không thể hoàn tác.");
    }
  };

  const visibleBills = bills.filter((bill) => (filter === "unpaid" ? !bill.paid : true));

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Khoản đóng theo chu kỳ</CardTitle>
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
            <select
              className="h-10 rounded-lg border border-input/80 bg-background px-3 text-base sm:text-sm"
              value={form.cycleType}
              onChange={(event) => {
                const cycleType = event.target.value as BillCycleType;
                setForm((prev) => ({
                  ...prev,
                  cycleType,
                  cycleValue:
                    cycleType === "monthly" ? "25" : cycleType === "weekly" ? "1" : "10",
                }));
              }}
            >
              {cycleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {form.cycleType === "weekly" ? (
              <select
                className="h-10 rounded-lg border border-input/80 bg-background px-3 text-base sm:text-sm"
                value={form.cycleValue}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cycleValue: event.target.value }))
                }
              >
                {weekdayLabels.map((label, index) => (
                  <option key={label} value={String(index + 1)}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type="number"
                min={1}
                max={form.cycleType === "monthly" ? 31 : undefined}
                inputMode="numeric"
                placeholder={form.cycleType === "monthly" ? "Ngày trong tháng" : "Số ngày/lần"}
                value={form.cycleValue}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cycleValue: event.target.value }))
                }
              />
            )}
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
          {form.cycleType === "custom_days" ? (
            <p className="text-xs text-muted-foreground">
              Ngày bắt đầu sẽ được dùng làm mốc chu kỳ tuỳ chỉnh.
            </p>
          ) : null}
          <p className="text-xs text-caramel">{syncMessage}</p>
          <Button className="w-full sm:w-auto" onClick={handleSubmit}>
            Lưu khoản đóng
          </Button>
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
            {loading ? (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Đang tải khoản đóng...
                </CardContent>
              </Card>
            ) : visibleBills.length === 0 ? (
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
                        {cycleLabel(bill)} • {formatCurrency(bill.amount)}
                      </p>
                      {bill.syncStatus && bill.syncStatus !== "synced" ? (
                        <p className="mt-1 text-xs text-caramel">
                          {bill.syncStatus === "sync_error"
                            ? bill.lastSyncError ?? "Đang chờ đồng bộ lại."
                            : "Đang chờ đồng bộ lên server."}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <Button
                        className="w-full sm:w-auto"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(bill)}
                      >
                        Sửa
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(bill)}
                      >
                        Xoá
                      </Button>
                      {bill.paid ? (
                        <Button
                          className="col-span-2 w-full sm:w-auto"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnpay(bill)}
                        >
                          Hoàn tác
                        </Button>
                      ) : (
                        <Button
                          className="col-span-2 w-full sm:w-auto"
                          size="sm"
                          variant="outline"
                          onClick={() => setPayingBill(bill)}
                        >
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận đã đóng</DialogTitle>
          </DialogHeader>
          {payingBill ? (
            <div className="rounded-2xl bg-cream p-4 text-sm text-caramel">
              <p>
                Xác nhận đã đóng khoản{" "}
                <span className="font-semibold text-mocha">{payingBill.name}</span>?
              </p>
              <p className="mt-2 font-semibold text-mocha">
                {formatCurrency(payingBill.amount)}
              </p>
              <p className="mt-1 text-xs">{cycleLabel(payingBill)}</p>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              className="w-full rounded-full sm:w-auto"
              variant="outline"
              onClick={() => setPayingBill(null)}
              disabled={confirmingPay}
            >
              Huỷ
            </Button>
            <Button
              className="w-full rounded-full sm:w-auto"
              onClick={handleConfirmPay}
              disabled={confirmingPay}
            >
              {confirmingPay ? "Đang xác nhận..." : "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
