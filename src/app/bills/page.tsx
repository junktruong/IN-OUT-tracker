"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Landmark, ListTodo, Plus, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { BillsStatusTabs, type BillsFilter, type UpcomingBillCard } from "./bills-status-tabs";
import { useBillsLocalFirst } from "@/hooks/useBillsLocalFirst";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toYmd } from "@/lib/domain/date";
import type { BillCycleType } from "@/lib/domain/bills";
import type { BillDTO, BillPaymentDTO } from "@/lib/types";

const formatCurrency = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

const cycleOptions: Array<{ value: BillCycleType; label: string }> = [
  { value: "monthly", label: "Hàng tháng" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "custom_days", label: "Tuỳ chỉnh" },
];

const weekdayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const cardClass =
  "rounded-3xl border border-latte bg-white shadow-[0_10px_32px_rgb(200,150,100,0.12)]";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-wide text-caramel";
const fieldClass = "h-11 rounded-2xl border-input/80 bg-white";
const selectClassName =
  "h-11 rounded-2xl border border-input/80 bg-white px-4 text-base text-mocha sm:text-sm";

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

const getOccurrenceKey = (
  occurrence: BillPaymentDTO,
  templateMap: Map<string, BillDTO>
) => {
  const template =
    templateMap.get(occurrence.templateClientId) ??
    (occurrence.templateId ? templateMap.get(occurrence.templateId) : undefined);

  const templateKey =
    template?.id ??
    occurrence.templateClientId ??
    occurrence.templateId ??
    [occurrence.name, occurrence.amount, occurrence.cycleType, occurrence.cycleValue].join("|");

  return `${templateKey}:${occurrence.dueDate}`;
};

const dedupeOccurrences = (items: BillPaymentDTO[], templateMap: Map<string, BillDTO>) => {
  const map = new Map<string, BillPaymentDTO>();

  items.forEach((occurrence) => {
    const key = getOccurrenceKey(occurrence, templateMap);
    const current = map.get(key);

    if (!current) {
      map.set(key, occurrence);
      return;
    }

    if (current.status !== "paid" && occurrence.status === "paid") {
      map.set(key, occurrence);
      return;
    }

    if (
      current.status === occurrence.status &&
      (occurrence.updatedAt ?? occurrence.createdAt ?? "") >
        (current.updatedAt ?? current.createdAt ?? "")
    ) {
      map.set(key, occurrence);
    }
  });

  return [...map.values()];
};

const formatDueTag = (bill: Pick<BillDTO, "cycleType">, dueDate: string) => {
  const [year, month, day] = dueDate.split("-");
  if (bill.cycleType === "monthly") {
    return `Tháng ${month}/${year}`;
  }
  if (bill.cycleType === "weekly") {
    return `Tuần có hạn ${day}/${month}`;
  }
  return `Kỳ ${dueDate}`;
};

export default function BillsPage() {
  const {
    items: templates,
    occurrences,
    loading,
    requestState,
    saveBill,
    removeBill,
    confirmBillPaid,
    undoBillPaid,
  } = useBillsLocalFirst();
  const [filter, setFilter] = useState<BillsFilter>("unpaid");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editorOpen, setEditorOpen] = useState(false);
  const [payingBill, setPayingBill] = useState<UpcomingBillCard | null>(null);
  const [confirmingPay, setConfirmingPay] = useState(false);

  const requestMessage = useMemo(() => {
    if (requestState.syncing) {
      return "Đang cập nhật khoản đóng...";
    }
    if (requestState.lastError) {
      return requestState.lastError;
    }
    return "Khoản đóng được lưu trực tiếp khi có mạng.";
  }, [requestState]);

  const templateMap = useMemo(() => {
    const map = new Map<string, BillDTO>();
    (Array.isArray(templates) ? templates : []).forEach((template) => {
      map.set(template.id, template);
      if (template.clientId) {
        map.set(template.clientId, template);
      }
      if (template.serverId) {
        map.set(template.serverId, template);
      }
    });
    return map;
  }, [templates]);

  const displayOccurrences = useMemo(
    () => dedupeOccurrences(Array.isArray(occurrences) ? occurrences : [], templateMap),
    [occurrences, templateMap]
  );

  const unpaidOccurrences = useMemo(
    () => displayOccurrences.filter((occurrence) => occurrence.status === "unpaid"),
    [displayOccurrences]
  );

  const paidOccurrences = useMemo(
    () => displayOccurrences.filter((occurrence) => occurrence.status === "paid"),
    [displayOccurrences]
  );

  const upcomingBills = useMemo<UpcomingBillCard[]>(
    () =>
      unpaidOccurrences
        .map((occurrence) => {
          const template =
            templateMap.get(occurrence.templateClientId) ??
            (occurrence.templateId ? templateMap.get(occurrence.templateId) : undefined);
          return template
            ? {
                template,
                occurrence,
              }
            : null;
        })
        .filter((item): item is UpcomingBillCard => item !== null)
        .sort((left, right) => left.occurrence.dueDate.localeCompare(right.occurrence.dueDate)),
    [unpaidOccurrences, templateMap]
  );

  const paidHistory = useMemo(
    () =>
      [...paidOccurrences].sort((left, right) => {
        const dueCompare = right.dueDate.localeCompare(left.dueDate);
        if (dueCompare !== 0) {
          return dueCompare;
        }
        return (right.paidAt ?? "").localeCompare(left.paidAt ?? "");
      }),
    [paidOccurrences]
  );

  const summary = useMemo(() => {
    const unpaidTotal = upcomingBills.reduce((total, bill) => total + bill.template.amount, 0);
    const paidTotal = paidHistory.reduce(
      (total, payment) => total + (payment.paidAmount ?? payment.amount),
      0
    );
    const nextDue = upcomingBills[0]?.occurrence.dueDate;

    return {
      templateCount: templates.length,
      unpaidCount: upcomingBills.length,
      paidCount: paidHistory.length,
      unpaidTotal,
      paidTotal,
      nextDue,
    };
  }, [paidHistory, templates.length, upcomingBills]);

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

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
          ? "Đã lưu khoản đóng."
          : "Cần có mạng để lưu khoản đóng."
      );
      closeEditor();
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
    setEditorOpen(true);
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
          ? "Đã xoá khoản đóng."
          : "Cần có mạng để xoá khoản đóng."
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
      await confirmBillPaid(payingBill.template, {
        dueDate: payingBill.occurrence.dueDate,
        paidAt: toYmd(new Date()),
        paidAmount: payingBill.template.amount,
      });
      toast.success(
        typeof navigator !== "undefined" && navigator.onLine
          ? "Đã xác nhận đóng."
          : "Cần có mạng để xác nhận khoản đóng."
      );
      setPayingBill(null);
    } catch {
      toast.error("Không thể xác nhận đã đóng.");
    } finally {
      setConfirmingPay(false);
    }
  };

  const handleUnpay = async (payment: BillPaymentDTO) => {
    try {
      await undoBillPaid(payment);
      toast.success(
        typeof navigator !== "undefined" && navigator.onLine
          ? "Đã hoàn tác khoản đã đóng."
          : "Cần có mạng để hoàn tác khoản đóng."
      );
    } catch {
      toast.error("Không thể hoàn tác.");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-latte bg-[radial-gradient(circle_at_top_left,_rgba(255,248,230,0.95),_rgba(255,255,255,1)_55%,_rgba(255,244,214,0.9))] p-5 shadow-[0_10px_32px_rgb(200,150,100,0.12)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-mocha sm:text-xl">Khoản đóng theo chu kỳ</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-caramel">
              Theo dõi các kỳ cần đóng, hoàn tác nhanh lịch sử đã ghi nhận và giữ mọi khoản theo
              cùng một nhịp trực quan như dashboard chính.
            </p>
            <p className="mt-3 text-xs text-caramel">{requestMessage}</p>
          </div>

          <div className="grid gap-3 sm:min-w-[260px] sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl bg-white/85 p-4 shadow-sm shadow-amber-900/5">
              <p className={sectionLabelClass}>Kỳ gần nhất</p>
              <p className="mt-2 text-xl font-semibold text-mocha">
                {summary.nextDue ?? "Chưa có"}
              </p>
              <p className="mt-1 text-xs text-caramel">
                {summary.nextDue
                  ? `Còn ${summary.unpaidCount} khoản đang chờ xác nhận`
                  : "Không có khoản nào đang mở"}
              </p>
            </div>
            <div className="rounded-3xl bg-white/85 p-4 shadow-sm shadow-amber-900/5">
              <p className={sectionLabelClass}>Tổng cần giữ</p>
              <p className="mt-2 text-xl font-semibold text-status-expense">
                {formatCurrency(summary.unpaidTotal)}
              </p>
              <p className="mt-1 text-xs text-caramel">
                Đã ghi nhận {formatCurrency(summary.paidTotal)} vào lịch sử
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-mocha">Danh sách kỳ đang theo dõi</p>
            <p className="mt-1 text-xs text-caramel">
              Tích chọn nhanh các khoản cần xác nhận trước, rồi mới thêm hoặc chỉnh mẫu khi cần.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-[11px] font-semibold text-caramel sm:flex">
            <ListTodo className="h-3.5 w-3.5" />
            {summary.unpaidCount} chờ xử lý
          </div>
        </div>

        <BillsStatusTabs
          filter={filter}
          loading={loading}
          upcomingBills={upcomingBills}
          paidHistory={paidHistory}
          onFilterChange={setFilter}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onConfirmPay={setPayingBill}
          onUnpay={handleUnpay}
          cycleLabel={cycleLabel}
          formatCurrency={formatCurrency}
          formatDueTag={formatDueTag}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className={cardClass}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-mocha">Tổng quan khoản đóng</p>
                <p className="mt-1 text-xs text-caramel">Nhìn nhanh số lượng và áp lực kỳ hiện tại</p>
              </div>
              <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-semibold text-caramel">
                {summary.templateCount} mẫu
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-cream p-3">
                <p className={sectionLabelClass}>Chưa đóng</p>
                <p className="mt-2 text-2xl font-semibold text-mocha">{summary.unpaidCount}</p>
                <p className="mt-1 text-[11px] text-caramel">
                  {formatCurrency(summary.unpaidTotal)}
                </p>
              </div>

              <div className="rounded-2xl bg-cream p-3">
                <p className={sectionLabelClass}>Lịch sử đóng</p>
                <p className="mt-2 text-2xl font-semibold text-status-income">{summary.paidCount}</p>
                <p className="mt-1 text-[11px] text-caramel">
                  {formatCurrency(summary.paidTotal)}
                </p>
              </div>

              <div className="rounded-2xl bg-cream p-3">
                <div className="flex items-center gap-2 text-caramel">
                  <CalendarRange className="h-4 w-4" />
                  <p className={sectionLabelClass}>Kỳ tiếp theo</p>
                </div>
                <p className="mt-2 break-words text-lg font-semibold text-mocha">
                  {summary.nextDue ?? "Chưa có kỳ mở"}
                </p>
              </div>

              <div className="rounded-2xl bg-cream p-3">
                <div className="flex items-center gap-2 text-caramel">
                  <Landmark className="h-4 w-4" />
                  <p className={sectionLabelClass}>Tổng đang theo dõi</p>
                </div>
                <p className="mt-2 break-words text-lg font-semibold text-caramel">
                  {formatCurrency(summary.unpaidTotal + summary.paidTotal)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-status-expense/15 bg-status-expense/10 px-4 py-3 text-sm text-mocha">
              {summary.unpaidCount > 0 ? (
                <>
                  Hiện còn <span className="font-semibold">{summary.unpaidCount}</span> khoản chưa
                  đóng. Ưu tiên xử lý các kỳ gần nhất để danh sách luôn phản ánh đúng thực tế.
                </>
              ) : (
                <>Tất cả các kỳ đang hiển thị đã được xử lý xong, bạn có thể thêm khoản mới bên cạnh.</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base text-mocha">Thêm nhanh mẫu khoản đóng</CardTitle>
                <p className="mt-1 text-xs text-caramel">
                  Dùng nút cộng để mở popup nhập liệu giống trang chính, giữ phần danh sách luôn
                  là trọng tâm của màn hình.
                </p>
              </div>
              <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-semibold text-caramel">
                Popup nhập liệu
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-cream p-3">
                <p className={sectionLabelClass}>Tạo mới</p>
                <p className="mt-2 text-sm text-mocha">
                  Mở popup bằng nút cộng để thêm khoản mới mà không đẩy danh sách xuống dưới.
                </p>
              </div>
              <div className="rounded-2xl bg-cream p-3">
                <p className={sectionLabelClass}>Chỉnh sửa</p>
                <p className="mt-2 text-sm text-mocha">
                  Nhấn `Sửa` ở từng khoản, popup sẽ tự nạp dữ liệu đang có để cập nhật nhanh.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-status-income/15 bg-status-income/10 px-4 py-3 text-sm text-mocha">
              {summary.templateCount > 0 ? (
                <>
                  Hiện có <span className="font-semibold">{summary.templateCount}</span> mẫu khoản
                  đang hoạt động. Popup nhập liệu giúp bạn thêm mới mà vẫn giữ mắt ở vùng tab xử lý
                  phía trên.
                </>
              ) : (
                <>
                  Bạn chưa có mẫu khoản nào. Nhấn nút cộng để tạo khoản đầu tiên và app sẽ tự sinh
                  các kỳ cần đóng tương ứng.
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-40 sm:right-6">
        <Button
          aria-label={editingId ? "Chỉnh sửa khoản đóng" : "Thêm khoản đóng"}
          className="h-14 w-14 rounded-full bg-primary-honey px-0 font-semibold text-mocha shadow-[0_10px_30px_rgb(200,150,100,0.2)] transition-all hover:-translate-y-1 hover:bg-primary-honey hover:shadow-md hover:shadow-amber-900/10"
          onClick={openCreateDialog}
        >
          <Plus className="h-5 w-5" />
          <span className="sr-only">Thêm khoản đóng</span>
        </Button>
      </div>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
            return;
          }
          setEditorOpen(true);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] border border-latte sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Chỉnh sửa khoản đóng" : "Tạo khoản đóng mới"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Cập nhật chu kỳ, mốc thời gian hoặc ghi chú cho khoản đang theo dõi."
                : "Thiết lập một mẫu khoản để app tự tạo các kỳ cần đóng theo tháng, tuần hoặc chu kỳ tuỳ chỉnh."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <p className={sectionLabelClass}>Tên khoản</p>
                <Input
                  className={fieldClass}
                  placeholder="Ví dụ: Tiền nhà, Internet, Trả góp"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <p className={sectionLabelClass}>Số tiền</p>
                <Input
                  className={fieldClass}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="0"
                  value={form.amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <p className={sectionLabelClass}>Loại chu kỳ</p>
                <select
                  className={selectClassName}
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
              </div>

              <div className="space-y-1.5">
                <p className={sectionLabelClass}>
                  {form.cycleType === "weekly"
                    ? "Ngày trong tuần"
                    : form.cycleType === "monthly"
                      ? "Ngày trong tháng"
                      : "Số ngày mỗi kỳ"}
                </p>
                {form.cycleType === "weekly" ? (
                  <select
                    className={selectClassName}
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
                    className={fieldClass}
                    type="number"
                    min={1}
                    max={form.cycleType === "monthly" ? 31 : undefined}
                    inputMode="numeric"
                    placeholder={form.cycleType === "monthly" ? "Ví dụ: 25" : "Ví dụ: 10"}
                    value={form.cycleValue}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, cycleValue: event.target.value }))
                    }
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <p className={sectionLabelClass}>Nhóm</p>
                <Input
                  className={fieldClass}
                  placeholder="Ví dụ: Nhà cửa, Dịch vụ"
                  value={form.group}
                  onChange={(event) => setForm((prev) => ({ ...prev, group: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <p className={sectionLabelClass}>Ngày bắt đầu</p>
                <Input
                  className={fieldClass}
                  type="date"
                  value={form.start}
                  onChange={(event) => setForm((prev) => ({ ...prev, start: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <p className={sectionLabelClass}>Ngày kết thúc</p>
                <Input
                  className={fieldClass}
                  type="date"
                  value={form.end}
                  onChange={(event) => setForm((prev) => ({ ...prev, end: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <p className={sectionLabelClass}>Ghi chú</p>
                <Input
                  className={fieldClass}
                  placeholder="Mô tả thêm để bạn dễ nhận ra khoản này"
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                />
              </div>
            </div>

            {form.cycleType === "custom_days" ? (
              <div className="rounded-2xl bg-cream px-4 py-3 text-xs text-caramel">
                Ngày bắt đầu sẽ được dùng làm mốc để app tính các kỳ tuỳ chỉnh tiếp theo.
              </div>
            ) : null}

            <div className="flex items-center gap-2 text-xs text-caramel">
              <ReceiptText className="h-4 w-4" />
              {editingId
                ? "Bạn đang cập nhật một khoản hiện có."
                : "Khoản mới sẽ được thêm ngay khi lưu."}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button className="w-full rounded-full sm:w-auto" variant="outline" onClick={closeEditor}>
              Huỷ
            </Button>
            <Button className="w-full rounded-full sm:w-auto" onClick={handleSubmit}>
              {editingId ? "Cập nhật khoản đóng" : "Lưu khoản đóng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payingBill} onOpenChange={(open) => !open && setPayingBill(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[28px] border border-latte sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận đã đóng</DialogTitle>
          </DialogHeader>
          {payingBill ? (
            <div className="rounded-2xl bg-cream p-4 text-sm text-caramel">
              <p>
                Xác nhận đã đóng khoản{" "}
                <span className="font-semibold text-mocha">{payingBill.template.name}</span> cho kỳ{" "}
                <span className="font-semibold text-mocha">{payingBill.occurrence.dueDate}</span>?
              </p>
              <p className="mt-2 font-semibold text-mocha">
                {formatCurrency(payingBill.template.amount)}
              </p>
              <p className="mt-1 text-xs">{cycleLabel(payingBill.template)}</p>
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
