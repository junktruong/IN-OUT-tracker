import { describe, expect, it } from "vitest";

import { reserveInWindow } from "@/lib/domain/reserve";
import { payrollWindow } from "@/lib/domain/payroll";

const window = payrollWindow(new Date("2024-05-20T00:00:00"), 5);

describe("reserveInWindow", () => {
  it("includes unpaid bills within payroll window", () => {
    const result = reserveInWindow(
      [
        {
          id: "1",
          name: "Tiền nhà",
          amount: 5000000,
          dueDay: 20,
          paid: false,
        },
      ],
      window
    );

    expect(result.total).toBe(5000000);
    expect(result.items).toHaveLength(1);
  });

  it("excludes paid bills", () => {
    const result = reserveInWindow(
      [
        {
          id: "1",
          name: "Internet",
          amount: 300000,
          dueDay: 18,
          paid: true,
        },
      ],
      window
    );

    expect(result.total).toBe(0);
  });

  it("respects start and end date", () => {
    const result = reserveInWindow(
      [
        {
          id: "1",
          name: "Gói tập",
          amount: 200000,
          dueDay: 25,
          paid: false,
          start: new Date("2024-06-01T00:00:00"),
        },
      ],
      window
    );

    expect(result.total).toBe(0);
  });
});
