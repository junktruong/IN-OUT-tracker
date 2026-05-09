import { describe, expect, it } from "vitest";

import { getBillCycleState, getOpenDueDates } from "@/lib/domain/billCycle";
import { toYmd } from "@/lib/domain/date";

describe("getBillCycleState", () => {
  it("advances monthly display to the next cycle after current cycle is paid", () => {
    const result = getBillCycleState(
      {
        id: "bill-1",
        name: "Internet",
        amount: 300000,
        cycleType: "monthly",
        cycleValue: 18,
        paid: true,
        paidAt: new Date("2024-05-19T00:00:00"),
      },
      new Date("2024-05-20T00:00:00")
    );

    expect(result.currentCyclePaid).toBe(true);
    expect(result.currentDueDate).toBe("2024-05-18");
    expect(result.displayDueDate).toBe("2024-06-18");
  });

  it("treats an old paid flag as unpaid again when the next cycle has started", () => {
    const result = getBillCycleState(
      {
        id: "bill-2",
        name: "Netflix",
        amount: 260000,
        cycleType: "monthly",
        cycleValue: 15,
        paid: true,
        paidAt: new Date("2024-04-16T00:00:00"),
      },
      new Date("2024-05-20T00:00:00")
    );

    expect(result.currentCyclePaid).toBe(false);
    expect(result.currentDueDate).toBe("2024-05-15");
    expect(result.displayDueDate).toBe("2024-05-15");
  });

  it("returns overdue and current-month unpaid due dates together", () => {
    const result = getOpenDueDates(
      {
        id: "bill-3",
        clientId: "bill-3",
        name: "Tra gop",
        amount: 1000000,
        cycleType: "monthly",
        cycleValue: 15,
        paid: false,
        start: new Date("2024-03-01T00:00:00"),
      },
      [
        {
          id: "payment-1",
          templateClientId: "bill-3",
          dueDate: new Date("2024-03-15T00:00:00"),
          paidAt: new Date("2024-03-15T00:00:00"),
          name: "Tra gop",
          amount: 1000000,
          cycleType: "monthly",
          cycleValue: 15,
        },
      ],
      new Date("2024-05-08T00:00:00")
    );

    expect(result.map(toYmd)).toEqual(["2024-04-15", "2024-05-15"]);
  });
});
