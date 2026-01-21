import { describe, expect, it } from "vitest";

import { transactionSchema } from "@/lib/domain/transactions";

describe("transactionSchema", () => {
  it("accepts valid payload", () => {
    const parse = transactionSchema.safeParse({
      date: "2024-05-10",
      type: "expense",
      amount: 120000,
      category: "Ăn uống",
      desc: "Cơm trưa",
      source: "Ví",
    });
    expect(parse.success).toBe(true);
  });

  it("rejects invalid amount", () => {
    const parse = transactionSchema.safeParse({
      date: "2024-05-10",
      type: "income",
      amount: 0,
      category: "Lương",
      desc: "Ứng trước",
    });
    expect(parse.success).toBe(false);
  });
});
