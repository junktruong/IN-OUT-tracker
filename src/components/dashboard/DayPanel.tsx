"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { transactionSchema } from "@/lib/domain/transactions";
import type { TransactionDTO } from "@/lib/types";

export type DayPanelProps = {
  dayKey: string;
  items: TransactionDTO[];
  daySummary: { income: number; expense: number; net: number };
  onReload: () => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function DayPanel({
  dayKey,
  items,
  daySummary,
  onReload,
}: DayPanelProps) {
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [form, setForm] = useState({
    date: "",
    type: "expense",
    amount: "",
    category: "",
    desc: "",
    source: "",
    method: "",
    account: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [items]
  );
  const filtered = useMemo(() => {
    return sorted.filter((item) => {
      if (filter !== "all" && item.type !== filter) {
        return false;
      }
      if (!keyword.trim()) {
        return true;
      }
      const needle = keyword.trim().toLowerCase();
      return [
        item.desc,
        item.category,
        item.source ?? "",
        item.method ?? "",
        item.account ?? "",
        item.note ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [filter, keyword, sorted]);

  const openEdit = (item: TransactionDTO) => {
    setEditing(item);
    setForm({
      date: item.date,
      type: item.type,
      amount: String(item.amount),
      category: item.category,
      desc: item.desc,
      source: item.source ?? "",
      method: item.method ?? "",
      account: item.account ?? "",
      note: item.note ?? "",
    });
    setConfirmText("");
  };

  const handleSave = async () => {
    if (!editing) {
      return;
    }
    const payload = {
      date: form.date,
      type: form.type as "expense" | "income",
      amount: Number(form.amount),
      category: form.category,
      desc: form.desc,
      source: form.source || undefined,
      method: form.method || undefined,
      account: form.account || undefined,
      note: form.note || undefined,
    };
    const parse = transactionSchema.safeParse(payload);
    if (!parse.success) {
      toast.error("Vui lòng nhập đầy đủ thông tin hợp lệ.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/transactions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parse.data),
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      toast.success("Đã cập nhật giao dịch.");
      setEditing(null);
      onReload();
    } catch {
      toast.error("Không thể cập nhật giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) {
      return;
    }
    if (confirmText !== "DELETE") {
      toast.error("Vui lòng nhập DELETE để xác nhận.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/transactions/${editing.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      toast.success("Đã xoá giao dịch.");
      setEditing(null);
      onReload();
    } catch {
      toast.error("Không thể xoá giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="h-full rounded-3xl border border-latte bg-white shadow-sm shadow-amber-900/5">
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2">
        <div>
          <CardTitle className="text-base text-mocha sm:text-lg">{dayKey}</CardTitle>
          <p className="mt-1 text-xs text-caramel">Chi tiết giao dịch trong ngày đã chọn</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="grid gap-2 rounded-2xl bg-cream p-3 text-sm min-[420px]:grid-cols-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-caramel">Ra</p>
            <p className="mt-1 break-words text-sm font-semibold text-status-expense sm:text-base">
              {formatCurrency(daySummary.expense)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-caramel">Vào</p>
            <p className="mt-1 break-words text-sm font-semibold text-status-income sm:text-base">
              {formatCurrency(daySummary.income)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-caramel">Ròng</p>
            <p className="mt-1 break-words text-sm font-semibold text-mocha sm:text-base">
              {formatCurrency(daySummary.net)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-mocha">Giao dịch trong ngày</p>
            <p className="text-xs text-caramel">{filtered.length} mục</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              className="w-full rounded-full"
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Tất cả
            </Button>
            <Button
              className="w-full rounded-full"
              size="sm"
              variant={filter === "expense" ? "default" : "outline"}
              onClick={() => setFilter("expense")}
            >
              Chi tiêu
            </Button>
            <Button
              className="w-full rounded-full"
              size="sm"
              variant={filter === "income" ? "default" : "outline"}
              onClick={() => setFilter("income")}
            >
              Thu nhập
            </Button>
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm nhanh..."
              className="col-span-3 h-11 rounded-2xl"
            />
          </div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 md:max-h-[520px]">
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-cream px-4 py-5 text-center text-sm text-caramel">
                Chưa có giao dịch phù hợp cho ngày này.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-latte bg-cream px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
                        item.type === "income" ? "bg-emerald-500" : "bg-orange-400"
                      }`}
                    >
                      {item.type === "income" ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-mocha">
                        {item.desc} - {formatCurrency(item.amount)}
                      </p>
                      <p className="break-words text-xs text-caramel">
                        {item.category} {item.source ? `• ${item.source}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
                    <p className="text-xs text-caramel">
                      {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <Button
                      className="w-auto rounded-full sm:w-full"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                    >
                      Xem/Sửa
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết giao dịch</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
            <select
              className="h-10 rounded-lg border border-input/80 bg-background px-3 text-base sm:text-sm"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            >
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
            </select>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Số tiền"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            <Input
              placeholder="Danh mục"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            />
            <Input
              className="sm:col-span-2"
              placeholder="Mô tả"
              value={form.desc}
              onChange={(event) => setForm((prev) => ({ ...prev, desc: event.target.value }))}
            />
            <Input
              placeholder="Nguồn"
              value={form.source}
              onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
            />
            <Input
              placeholder="Phương thức"
              value={form.method}
              onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}
            />
            <Input
              placeholder="Tài khoản"
              value={form.account}
              onChange={(event) => setForm((prev) => ({ ...prev, account: event.target.value }))}
            />
            <Input
              placeholder="Ghi chú"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            />
            <Input
              className="sm:col-span-2"
              placeholder='Nhập "DELETE" để xoá'
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button className="w-full sm:w-auto" variant="outline" onClick={handleDelete} disabled={saving}>
              Xoá
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
