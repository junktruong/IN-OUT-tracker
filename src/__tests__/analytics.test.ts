import { describe, expect, it } from "vitest";

import { expenseByCategory, groupByDaySeries, topCategories } from "@/lib/domain/analytics";
import type { TransactionDTO } from "@/lib/types";

const buildTransaction = (overrides: Partial<TransactionDTO>): TransactionDTO => ({
  id: overrides.id ?? "id",
  date: overrides.date ?? "2024-05-01",
  type: overrides.type ?? "expense",
  amount: overrides.amount ?? 0,
  category: overrides.category ?? "Ăn uống",
  desc: overrides.desc ?? "Test",
  createdAt: overrides.createdAt ?? "2024-05-01T10:00:00.000Z",
  source: overrides.source,
  method: overrides.method,
  account: overrides.account,
  note: overrides.note,
});

describe("groupByDaySeries", () => {
  it("builds series across multiple days", () => {
    const transactions = [
      buildTransaction({ id: "1", date: "2024-05-01", type: "expense", amount: 100 }),
      buildTransaction({ id: "2", date: "2024-05-01", type: "income", amount: 50 }),
      buildTransaction({ id: "3", date: "2024-05-03", type: "expense", amount: 200 }),
      buildTransaction({ id: "4", date: "2024-05-03", type: "income", amount: 300 }),
    ];

    const series = groupByDaySeries("2024-05", transactions);

    expect(series[0]).toMatchObject({ day: 1, expense: 100, income: 50 });
    expect(series[2]).toMatchObject({ day: 3, expense: 200, income: 300 });
  });
});

describe("expenseByCategory", () => {
  it("aggregates expense amounts per category", () => {
    const transactions = [
      buildTransaction({ id: "1", category: "Ăn uống", amount: 100 }),
      buildTransaction({ id: "2", category: "Ăn uống", amount: 200 }),
      buildTransaction({ id: "3", category: "Di chuyển", amount: 50 }),
      buildTransaction({ id: "4", type: "income", category: "Lương", amount: 500 }),
    ];

    const result = expenseByCategory(transactions);
    const food = result.find((item) => item.category === "Ăn uống");
    const travel = result.find((item) => item.category === "Di chuyển");

    expect(food?.amount).toBe(300);
    expect(travel?.amount).toBe(50);
  });
});

describe("topCategories", () => {
  it("merges extra categories into Khác", () => {
    const list = [
      { category: "A", amount: 100 },
      { category: "B", amount: 90 },
      { category: "C", amount: 80 },
      { category: "D", amount: 70 },
      { category: "E", amount: 60 },
      { category: "F", amount: 50 },
      { category: "G", amount: 40 },
      { category: "H", amount: 30 },
      { category: "I", amount: 20 },
    ];

    const result = topCategories(list, 8);

    expect(result).toHaveLength(9);
    expect(result[8]).toEqual({ category: "Khác", amount: 20 });
  });
});
