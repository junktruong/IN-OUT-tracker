"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Plus } from "lucide-react";

import { useCategories } from "@/hooks/useCategories";
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
import { cn } from "@/lib/utils";

type TransactionComposerProps = {
  dayKey: string;
  onQuickAdd: (raw: string) => Promise<{ added: number; skipped: string[] }>;
  onManualAdd: (payload: TransactionInput) => Promise<void>;
  onReload: () => void;
  variant?: "inline" | "fab";
};

type WizardStep = 1 | 2 | 3 | 4;

type WizardForm = {
  type: "expense" | "income" | null;
  amount: string;
  categoryId?: string;
  category: string;
  note: string;
  date: string;
};

const createDefaultWizardForm = (dayKey: string): WizardForm => ({
  type: null,
  amount: "",
  categoryId: undefined,
  category: "",
  note: "",
  date: dayKey,
});

const stepLabel = (step: WizardStep) => `Bước ${step}/4`;

export function TransactionComposer({
  dayKey,
  onQuickAdd,
  onManualAdd,
  onReload,
  variant = "inline",
}: TransactionComposerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [step, setStep] = useState<WizardStep>(1);
  const [wizard, setWizard] = useState<WizardForm>(() => createDefaultWizardForm(dayKey));
  const [saving, setSaving] = useState(false);
  const { categories, loading: categoriesLoading } = useCategories(manualOpen);

  const filteredCategories = useMemo(
    () => categories.filter((item) => item.categoryType === (wizard.type ?? "expense")),
    [categories, wizard.type]
  );

  const openQuick = () => {
    setMenuOpen(false);
    setQuickOpen(true);
  };

  const openManual = () => {
    setMenuOpen(false);
    setWizard(createDefaultWizardForm(dayKey));
    setStep(1);
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
      date: wizard.date || dayKey,
      type: wizard.type ?? "expense",
      amount: Number(wizard.amount),
      categoryId: wizard.categoryId,
      category: wizard.category,
      desc: wizard.note.trim() || wizard.category,
      note: wizard.note.trim() || undefined,
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
      setWizard(createDefaultWizardForm(dayKey));
      setStep(1);
      toast.success("Đã thêm giao dịch.");
      onReload();
    } catch {
      toast.error("Không thể thêm giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "z-50",
        variant === "fab"
          ? "fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 flex flex-col items-end gap-3 sm:right-6"
          : "relative"
      )}
    >
      {menuOpen ? (
        <div
          className={cn(
            "overflow-hidden rounded-3xl border border-latte bg-white shadow-[0_10px_32px_rgb(200,150,100,0.14)]",
            variant === "fab"
              ? "w-[min(20rem,calc(100vw-2rem))]"
              : "absolute right-0 top-full z-20 mt-3 w-full"
          )}
        >
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
              Form từng bước, chạm chọn nhanh
            </span>
          </button>
        </div>
      ) : null}

      <Button
        aria-label="Thêm giao dịch"
        className={cn(
          "bg-primary-honey font-semibold text-mocha shadow-[0_10px_30px_rgb(200,150,100,0.2)] transition-all hover:-translate-y-1 hover:bg-primary-honey hover:shadow-md hover:shadow-amber-900/10",
          variant === "fab"
            ? "h-14 w-14 rounded-full px-0"
            : "h-14 w-full rounded-full px-6 text-base"
        )}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Plus className="h-5 w-5" />
        {variant === "fab" ? <span className="sr-only">Thêm giao dịch</span> : "Thêm giao dịch"}
      </Button>

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
            <Button
              className="h-11 w-full text-base sm:w-auto"
              onClick={handleQuickSubmit}
              disabled={saving}
            >
              {saving ? "Đang thêm..." : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manualOpen}
        onOpenChange={(open) => {
          setManualOpen(open);
          if (!open) {
            setStep(1);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle>Nhập chi tiết</DialogTitle>
                <DialogDescription>{stepLabel(step)}</DialogDescription>
              </div>
              {step > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setStep((current) => Math.max(1, current - 1) as WizardStep)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Quay lại
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="animate-[wizard-enter_180ms_ease-out]">
            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-center text-lg font-semibold text-mocha">
                  Bạn muốn ghi chép gì?
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-3xl border border-latte bg-white px-5 py-8 text-left shadow-sm shadow-amber-900/5 transition hover:-translate-y-0.5 hover:bg-cream"
                    onClick={() => {
                      setWizard((prev) => ({ ...prev, type: "income" }));
                      setStep(2);
                    }}
                  >
                    <span className="text-3xl">🟢</span>
                    <span className="mt-3 block text-xl font-semibold text-mocha">Thu nhập</span>
                    <span className="mt-1 block text-sm text-caramel">Lương, thưởng, hoàn tiền</span>
                  </button>
                  <button
                    type="button"
                    className="rounded-3xl border border-latte bg-white px-5 py-8 text-left shadow-sm shadow-amber-900/5 transition hover:-translate-y-0.5 hover:bg-cream"
                    onClick={() => {
                      setWizard((prev) => ({ ...prev, type: "expense" }));
                      setStep(2);
                    }}
                  >
                    <span className="text-3xl">🔴</span>
                    <span className="mt-3 block text-xl font-semibold text-mocha">Chi tiêu</span>
                    <span className="mt-1 block text-sm text-caramel">Ăn uống, đi chơi, dịch vụ</span>
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <p className="text-center text-lg font-semibold text-mocha">Số tiền là bao nhiêu?</p>
                <div className="mx-auto max-w-md space-y-4">
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    autoFocus
                    placeholder="0"
                    value={wizard.amount}
                    onChange={(event) =>
                      setWizard((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    className="h-20 rounded-3xl text-center text-3xl font-semibold"
                  />
                  <Button
                    className="h-12 w-full rounded-full text-base"
                    disabled={!Number.isFinite(Number(wizard.amount)) || Number(wizard.amount) <= 0}
                    onClick={() => setStep(3)}
                  >
                    Tiếp tục
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-center text-lg font-semibold text-mocha">Thuộc danh mục nào?</p>
                {categoriesLoading ? (
                  <p className="text-center text-sm text-caramel">Đang tải danh mục...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filteredCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="rounded-3xl border border-latte bg-white px-4 py-5 text-center shadow-sm shadow-amber-900/5 transition hover:-translate-y-0.5 hover:bg-cream"
                        onClick={() => {
                          setWizard((prev) => ({
                            ...prev,
                            categoryId: category.id,
                            category: category.name,
                          }));
                          setStep(4);
                        }}
                      >
                        <span className="text-3xl">{category.icon}</span>
                        <span className="mt-2 block text-sm font-semibold text-mocha">
                          {category.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <p className="text-center text-lg font-semibold text-mocha">
                  Ghi chú thêm và ngày
                </p>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Ghi chú thêm (tuỳ chọn)"
                    value={wizard.note}
                    onChange={(event) =>
                      setWizard((prev) => ({ ...prev, note: event.target.value }))
                    }
                    className="min-h-[140px] rounded-3xl"
                  />
                  <Input
                    type="date"
                    value={wizard.date}
                    onChange={(event) =>
                      setWizard((prev) => ({ ...prev, date: event.target.value }))
                    }
                    className="h-12 rounded-2xl"
                  />
                </div>
                <DialogFooter>
                  <Button
                    className="h-12 w-full rounded-full text-base sm:w-auto"
                    onClick={handleManualSubmit}
                    disabled={saving}
                  >
                    {saving ? "Đang lưu..." : "Hoàn tất"}
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
