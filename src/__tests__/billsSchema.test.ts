import { describe, expect, it } from "vitest";

import { billSchema } from "@/lib/domain/bills";

describe("billSchema", () => {
  it("accepts valid payload", () => {
    const parse = billSchema.safeParse({
      name: "Tiền nhà",
      amount: 5000000,
      cycleType: "monthly",
      cycleValue: 5,
      start: "2024-01-01",
      end: "2024-12-31",
    });
    expect(parse.success).toBe(true);
  });

  it("rejects invalid date range", () => {
    const parse = billSchema.safeParse({
      name: "Internet",
      amount: 300000,
      cycleType: "weekly",
      cycleValue: 3,
      start: "2024-12-31",
      end: "2024-01-01",
    });
    expect(parse.success).toBe(false);
  });

  it("rejects invalid cycle values", () => {
    const parse = billSchema.safeParse({
      name: "Internet",
      amount: 300000,
      cycleType: "weekly",
      cycleValue: 9,
    });

    expect(parse.success).toBe(false);
  });
});
