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

  const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      toast.error("Không thể xoá giao dịch.");
    } finally {
      setSaving(false);
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Tất cả
            </Button>
            <Button
              size="sm"
              variant={filter === "expense" ? "default" : "outline"}
              onClick={() => setFilter("expense")}
            >
              Chi tiêu
            </Button>
            <Button
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
              className="h-9 w-full md:w-48"
            />
          </div>
          <div className="space-y-3">
            {filtered.map((item) => (
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
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                    Xem/Sửa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết giao dịch</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            >
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
            </select>
            <Input
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
              className="md:col-span-2"
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
              className="md:col-span-2"
              placeholder='Nhập "DELETE" để xoá'
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              Xoá
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
