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
          cycleType: "monthly",
          cycleValue: 20,
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
          cycleType: "monthly",
          cycleValue: 18,
          paid: true,
        },
      ],
      window
    );

    expect(result.total).toBe(0);
  });

  it("computes due date around payroll window", () => {
    const result = reserveInWindow(
      [
        {
          id: "1",
          name: "Bảo hiểm",
          amount: 900000,
          cycleType: "monthly",
          cycleValue: 5,
          paid: false,
        },
      ],
      window
    );

    expect(result.items[0]?.dueDate).toBe("2024-06-05");
  });

  it("respects start and end date", () => {
    const result = reserveInWindow(
      [
        {
          id: "1",
          name: "Gói tập",
          amount: 200000,
          cycleType: "monthly",
          cycleValue: 25,
          paid: false,
          start: new Date("2024-06-01T00:00:00"),
        },
      ],
      window
    );

    expect(result.total).toBe(0);
  });

  it("excludes bills after end date", () => {
    const result = reserveInWindow(
      [
        {
          id: "1",
          name: "Hội phí",
          amount: 100000,
          cycleType: "monthly",
          cycleValue: 20,
          paid: false,
          end: new Date("2024-05-10T00:00:00"),
        },
      ],
      window
    );

    expect(result.total).toBe(0);
  });

  it("includes every weekly occurrence inside the payroll window", () => {
    const result = reserveInWindow(
      [
        {
          id: "1",
          name: "Giặt ủi",
          amount: 50000,
          cycleType: "weekly",
          cycleValue: 1,
          paid: false,
        },
      ],
      window
    );

    expect(result.items.map((item) => item.dueDate)).toEqual([
      "2024-05-06",
      "2024-05-13",
      "2024-05-20",
      "2024-05-27",
      "2024-06-03",
    ]);
    expect(result.total).toBe(250000);
  });

  it("uses start date as the custom-days cycle anchor", () => {
    const result = reserveInWindow(
      [
        {
          id: "1",
          name: "Thuốc",
          amount: 120000,
          cycleType: "custom_days",
          cycleValue: 10,
          paid: false,
          start: new Date("2024-05-10T00:00:00"),
        },
      ],
      window
    );

    expect(result.items.map((item) => item.dueDate)).toEqual(["2024-05-10", "2024-05-20", "2024-05-30"]);
    expect(result.total).toBe(360000);
  });
});
