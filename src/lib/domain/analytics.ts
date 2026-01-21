import type { TransactionDTO } from "@/lib/types";

export type DaySeriesPoint = { day: number; expense: number; income: number };
export type CategoryAmount = { category: string; amount: number };

export const groupByDaySeries = (monthKey: string, transactions: TransactionDTO[]): DaySeriesPoint[] => {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const series = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    expense: 0,
    income: 0,
  }));

  transactions.forEach((item) => {
    if (!item.date.startsWith(monthKey)) {
      return;
    }
    const day = Number(item.date.slice(8, 10));
    if (!Number.isFinite(day) || day < 1 || day > daysInMonth) {
      return;
    }
    const target = series[day - 1];
    if (!target) {
      return;
    }
    if (item.type === "income") {
      target.income += item.amount;
    } else {
      target.expense += item.amount;
    }
  });

  return series;
};

export const expenseByCategory = (transactions: TransactionDTO[]): CategoryAmount[] => {
  const map = new Map<string, number>();
  transactions.forEach((item) => {
    if (item.type !== "expense") {
      return;
    }
    const key = item.category?.trim() || "Khác";
    map.set(key, (map.get(key) ?? 0) + item.amount);
  });
  return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
};

export const topCategories = (list: CategoryAmount[], limit = 8): CategoryAmount[] => {
  const sorted = [...list].sort((a, b) => b.amount - a.amount);
  if (sorted.length <= limit) {
    return sorted;
  }
  const top = sorted.slice(0, limit);
  const restTotal = sorted.slice(limit).reduce((sum, item) => sum + item.amount, 0);
  if (restTotal > 0) {
    top.push({ category: "Khác", amount: restTotal });
  }
  return top;
};
