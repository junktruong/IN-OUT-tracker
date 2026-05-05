"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useCategories } from "@/hooks/useCategories";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BudgetDTO } from "@/lib/types";
import type { BudgetPeriod } from "@/lib/domain/budgets";

const periodOptions: Array<{ value: BudgetPeriod; label: string }> = [
  { value: "weekly", label: "Tuần" },
  { value: "monthly", label: "Tháng" },
  { value: "yearly", label: "Năm" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.abs(value));

const ratioColor = (ratio: number) => {
  if (ratio >= 1) {
    return "bg-red-400";
  }
  if (ratio >= 0.8) {
    return "bg-status-expense";
  }
  return "bg-status-income";
};

export default function BudgetsPage() {
  const [period, setPeriod] = useState<BudgetPeriod>("weekly");
  const [items, setItems] = useState<BudgetDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [amountLimit, setAmountLimit] = useState("");
  const { categories, loading: categoriesLoading } = useCategories(true);

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.categoryType === "expense"),
    [categories]
  );

  const fetchBudgets = useCallback(async (targetPeriod: BudgetPeriod) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/budgets?period=${targetPeriod}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("failed");
      }

      const data = (await response.json()) as { items?: BudgetDTO[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBudgets(period);
  }, [fetchBudgets, period]);

  useEffect(() => {
    if (expenseCategories.length === 0) {
      setSelectedCategoryId("");
      return;
    }

    const hasSelected = expenseCategories.some((item) => item.id === selectedCategoryId);
    if (!selectedCategoryId || !hasSelected) {
      setSelectedCategoryId(expenseCategories[0].id);
    }
  }, [expenseCategories, selectedCategoryId]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.limit += item.amountLimit;
          acc.spent += item.spent;
          return acc;
        },
        { limit: 0, spent: 0 }
      ),
    [items]
  );

  const activePeriodLabel =
    periodOptions.find((item) => item.value === period)?.label.toLowerCase() ?? "tuần";

  const handleSave = async () => {
    const parsedLimit = Number(amountLimit);

    if (!selectedCategoryId) {
      toast.error("Vui lòng chọn danh mục.");
      return;
    }
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      toast.error("Hạn mức phải lớn hơn 0.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          amountLimit: parsedLimit,
          period,
        }),
      });

      if (!response.ok) {
        throw new Error("failed");
      }

      setAmountLimit("");
      toast.success("Đã lưu ngân sách.");
      await fetchBudgets(period);
    } catch {
      toast.error("Không thể lưu ngân sách.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-latte bg-white shadow-sm shadow-amber-900/5">
        <CardHeader className="space-y-2 p-5 sm:p-6">
          <CardTitle className="text-xl text-mocha">Ngân sách</CardTitle>
          <p className="text-sm text-caramel">
            Theo dõi ngân sách theo tuần, tháng hoặc năm cho từng danh mục chi tiêu.
          </p>
        </CardHeader>
        <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as BudgetPeriod)}>
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-amber-100/80 p-1 sm:w-auto">
              {periodOptions.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="rounded-3xl border border-latte bg-cream p-4 shadow-sm shadow-amber-900/5">
              <p className="text-sm font-semibold text-mocha">
                Thiết lập ngân sách {activePeriodLabel}
              </p>
              <div className="mt-4 space-y-3">
                <select
                  className="h-12 w-full rounded-2xl border border-latte bg-white px-4 text-sm text-mocha"
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  disabled={categoriesLoading || expenseCategories.length === 0}
                >
                  {expenseCategories.length === 0 ? (
                    <option value="">Chưa có danh mục chi tiêu</option>
                  ) : null}
                  {expenseCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Hạn mức"
                  value={amountLimit}
                  onChange={(event) => setAmountLimit(event.target.value)}
                  className="h-12 rounded-2xl"
                />
                <Button
                  className="h-12 w-full rounded-full"
                  onClick={handleSave}
                  disabled={saving || categoriesLoading || expenseCategories.length === 0}
                >
                  {saving ? "Đang lưu..." : "Lưu ngân sách"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="rounded-3xl border-latte bg-white shadow-sm shadow-amber-900/5">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-caramel">
                    Tổng hạn mức
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-mocha">
                    {formatCurrency(totals.limit)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-3xl border-latte bg-white shadow-sm shadow-amber-900/5">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-caramel">
                    Đã sử dụng
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-status-expense">
                    {formatCurrency(totals.spent)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-latte bg-white shadow-sm shadow-amber-900/5">
        <CardHeader className="p-5 sm:p-6">
          <CardTitle className="text-lg text-mocha">
            Theo dõi ngân sách {activePeriodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
          {loading ? (
            <p className="text-sm text-caramel">Đang tải dữ liệu ngân sách...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-caramel">Chưa có ngân sách nào cho mốc thời gian này.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-latte bg-cream px-4 py-4 shadow-sm shadow-amber-900/5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-mocha">
                      <span className="mr-2">{item.categoryIcon}</span>
                      {item.categoryName}
                    </p>
                    <p className="text-sm text-caramel">
                      {item.periodLabel} • Đã dùng {formatCurrency(item.spent)} / {formatCurrency(item.amountLimit)}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      item.remaining >= 0 ? "text-mocha" : "text-red-500"
                    }`}
                  >
                    {item.remaining >= 0 ? "Còn lại" : "Vượt"} {formatCurrency(item.remaining)}đ
                  </p>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${ratioColor(item.ratio)}`}
                    style={{ width: `${Math.min(100, Math.max(6, item.ratio * 100))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
