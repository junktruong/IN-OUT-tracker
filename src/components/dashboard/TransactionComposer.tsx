"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { transactionSchema, type TransactionInput } from "@/lib/domain/transactions";

type TransactionComposerProps = {
  dayKey: string;
  onQuickAdd: (raw: string) => Promise<{ added: number; skipped: string[] }>;
  onManualAdd: (payload: TransactionInput) => Promise<void>;
  onReload: () => void;
};

type ManualForm = {
  date: string;
  type: "expense" | "income";
  amount: string;
  category: string;
  desc: string;
  source: string;
  method: string;
  account: string;
  note: string;
};

const expenseCategories = ["Ăn uống", "Đi lại", "Nhà cửa", "Hoá đơn", "Sức khoẻ", "Khác"];
const incomeCategories = ["Lương", "Thưởng", "Hoàn tiền", "Thu khác"];
const methods = ["Tiền mặt", "Chuyển khoản", "Thẻ", "Ví điện tử"];

const defaultManualForm = (dayKey: string): ManualForm => ({
  date: dayKey,
  type: "expense",
  amount: "",
  category: "Ăn uống",
  desc: "",
  source: "",
  method: "Tiền mặt",
  account: "",
  note: "",
});

export function TransactionComposer({
  dayKey,
  onQuickAdd,
  onManualAdd,
  onReload,
}: TransactionComposerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [manualForm, setManualForm] = useState<ManualForm>(() => defaultManualForm(dayKey));
  const [saving, setSaving] = useState(false);

  const categoryOptions =
    manualForm.type === "income" ? incomeCategories : expenseCategories;

  const openQuick = () => {
    setMenuOpen(false);
    setQuickOpen(true);
  };

  const openManual = () => {
    setMenuOpen(false);
    setManualForm(defaultManualForm(dayKey));
    setManualOpen(true);
  };

  const handleQuickSubmit = async () => {
    if (!raw.trim()) {
      toast.error("Vui lòng nhập nội dung.");
      return;
    }

    setSaving(true);
    try {
      const result = await onQuickAdd(raw);
      setRaw("");
      setQuickOpen(false);
      toast.success(`Đã thêm ${result.added} dòng, bỏ qua ${result.skipped.length} dòng.`);
      onReload();
    } catch {
      toast.error("Không thể thêm giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = async () => {
    const payload = {
      date: manualForm.date,
      type: manualForm.type,
      amount: Number(manualForm.amount),
      category: manualForm.category,
      desc: manualForm.desc,
      source: manualForm.source || undefined,
      method: manualForm.method || undefined,
      account: manualForm.account || undefined,
      note: manualForm.note || undefined,
    };
    const parse = transactionSchema.safeParse(payload);

    if (!parse.success) {
      toast.error("Vui lòng nhập đầy đủ thông tin hợp lệ.");
      return;
    }

    setSaving(true);
    try {
      await onManualAdd(parse.data);
      setManualOpen(false);
      setManualForm(defaultManualForm(dayKey));
      toast.success("Đã thêm giao dịch.");
      onReload();
    } catch {
      toast.error("Không thể thêm giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <Button
        className="h-14 w-full rounded-full bg-primary-honey px-6 text-base font-semibold text-mocha shadow-[0_10px_30px_rgb(200,150,100,0.2)] transition-all hover:-translate-y-1 hover:bg-primary-honey hover:shadow-md hover:shadow-amber-900/10"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Plus className="h-5 w-5" />
        Thêm giao dịch
      </Button>

      {menuOpen ? (
        <div className="absolute right-0 z-20 mt-3 w-full overflow-hidden rounded-3xl border border-latte bg-white shadow-[0_10px_32px_rgb(200,150,100,0.14)]">
          <button
            className="block w-full px-5 py-4 text-left text-sm text-mocha transition-colors hover:bg-cream"
            onClick={openQuick}
          >
            <span className="font-medium">Nhập nhanh bằng văn bản</span>
            <span className="mt-1 block text-xs text-caramel">
              phở 45k; cafe 25k
            </span>
          </button>
          <button
            className="block w-full border-t border-latte px-5 py-4 text-left text-sm text-mocha transition-colors hover:bg-cream"
            onClick={openManual}
          >
            <span className="font-medium">Nhập chi tiết</span>
            <span className="mt-1 block text-xs text-caramel">
              Chọn ngày, loại, số tiền và danh mục
            </span>
          </button>
        </div>
      ) : null}

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nhập nhanh bằng văn bản</DialogTitle>
            <DialogDescription>
              Dùng dấu chấm phẩy hoặc xuống dòng để nhập nhiều giao dịch.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder={`phở 45k; cafe 25k\n[Đi lại] Grab 70k @Grab\n+ [Lương] 15000000 @Công ty`}
            className="min-h-[280px] bg-white text-base"
          />
          <DialogFooter>
            <Button className="h-11 w-full text-base sm:w-auto" onClick={handleQuickSubmit} disabled={saving}>
              {saving ? "Đang thêm..." : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nhập chi tiết</DialogTitle>
            <DialogDescription>Thông tin rõ ràng giúp báo cáo tháng chính xác hơn.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="date"
              className="h-12 bg-white text-base"
              value={manualForm.date}
              onChange={(event) =>
                setManualForm((prev) => ({ ...prev, date: event.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  className="h-12 text-base"
                  variant={manualForm.type === type ? "default" : "outline"}
                  onClick={() =>
                    setManualForm((prev) => ({
                      ...prev,
                      type,
                      category: type === "income" ? "Lương" : "Ăn uống",
                    }))
                  }
                >
                  {type === "income" ? "Thu" : "Chi"}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Số tiền"
              className="h-12 bg-white text-base"
              value={manualForm.amount}
              onChange={(event) =>
                setManualForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
            <select
              className="h-12 rounded-lg border border-input/80 bg-white px-3 text-base"
              value={manualForm.category}
              onChange={(event) =>
                setManualForm((prev) => ({ ...prev, category: event.target.value }))
              }
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Input
              placeholder="Mô tả"
              className="h-12 bg-white text-base sm:col-span-2"
              value={manualForm.desc}
              onChange={(event) =>
                setManualForm((prev) => ({ ...prev, desc: event.target.value }))
              }
            />
            <Input
              placeholder="Nguồn"
              className="h-12 bg-white text-base"
              value={manualForm.source}
              onChange={(event) =>
                setManualForm((prev) => ({ ...prev, source: event.target.value }))
              }
            />
            <select
              className="h-12 rounded-lg border border-input/80 bg-white px-3 text-base"
              value={manualForm.method}
              onChange={(event) =>
                setManualForm((prev) => ({ ...prev, method: event.target.value }))
              }
            >
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <Input
              placeholder="Tài khoản"
              className="h-12 bg-white text-base"
              value={manualForm.account}
              onChange={(event) =>
                setManualForm((prev) => ({ ...prev, account: event.target.value }))
              }
            />
            <Input
              placeholder="Ghi chú"
              className="h-12 bg-white text-base"
              value={manualForm.note}
              onChange={(event) =>
                setManualForm((prev) => ({ ...prev, note: event.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button className="h-11 w-full text-base sm:w-auto" onClick={handleManualSubmit} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu giao dịch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
