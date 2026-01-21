import { describe, expect, it } from "vitest";

import { payrollWindow } from "@/lib/domain/payroll";
import { toYmd } from "@/lib/domain/date";

describe("payrollWindow", () => {
  it("returns last and next pay in same month when today after payday", () => {
    const today = new Date("2024-05-20T00:00:00");
    const window = payrollWindow(today, 15);
    expect(toYmd(window.lastPay)).toBe("2024-05-15");
    expect(toYmd(window.nextPay)).toBe("2024-06-15");
  });

  it("uses previous month when today before payday", () => {
    const today = new Date("2024-05-10T00:00:00");
    const window = payrollWindow(today, 25);
    expect(toYmd(window.lastPay)).toBe("2024-04-25");
    expect(toYmd(window.nextPay)).toBe("2024-05-25");
  });

  it("clamps payday to month length", () => {
    const today = new Date("2024-02-10T00:00:00");
    const window = payrollWindow(today, 31);
    expect(toYmd(window.lastPay)).toBe("2024-01-31");
    expect(toYmd(window.nextPay)).toBe("2024-02-29");
  });
});
