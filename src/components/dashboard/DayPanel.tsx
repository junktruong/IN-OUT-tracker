"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { transactionSchema } from "@/lib/domain/transactions";
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
    } catch {
      toast.error("Không thể thêm giao dịch.");
    } finally {
      setLoading(false);
    }
  };

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
    <Card className="h-full">
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
        <CardTitle className="text-lg">{dayKey}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-4 pt-0 sm:space-y-6 sm:p-6 sm:pt-0">
        <div className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm min-[420px]:grid-cols-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted-foreground">Ra</p>
            <p className="mt-1 break-words text-sm font-semibold text-rose-600 sm:text-base">
              {formatCurrency(daySummary.expense)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted-foreground">Vào</p>
            <p className="mt-1 break-words text-sm font-semibold text-emerald-600 sm:text-base">
              {formatCurrency(daySummary.income)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted-foreground">Ròng</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground sm:text-base">
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
            className="min-h-[110px] sm:min-h-[140px] md:min-h-[160px]"
          />
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang thêm..." : "Thêm"}
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Giao dịch trong ngày</p>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              className="w-full sm:w-auto"
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Tất cả
            </Button>
            <Button
              className="w-full sm:w-auto"
              size="sm"
              variant={filter === "expense" ? "default" : "outline"}
              onClick={() => setFilter("expense")}
            >
              Chi tiêu
            </Button>
            <Button
              className="w-full sm:w-auto"
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
              className="col-span-3 h-10 w-full sm:w-56"
            />
          </div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1 md:max-h-[520px]">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border bg-background px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
                      item.type === "income" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  >
                    {item.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">
                      {item.desc} - {formatCurrency(item.amount)}
                    </p>
                    <p className="break-words text-xs text-muted-foreground">
                      {item.category} {item.source ? `• ${item.source}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <Button
                    className="w-auto sm:w-full"
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(item)}
                  >
                    Xem/Sửa
                  </Button>
                </div>
              </div>
            ))}
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
              className="h-10 rounded-md border border-input bg-background px-3 text-base sm:text-sm"
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
