import { describe, expect, it } from "vitest";

import { quickParse } from "@/lib/domain/quickParse";

describe("quickParse", () => {
  it("parses multiple entries with separators", () => {
    const result = quickParse("phở 45k; cafe 25k\n[Đi lại] Grab 70k @Grab");
    expect(result.items).toHaveLength(3);
    expect(result.items[0].amount).toBe(45000);
    expect(result.items[1].desc).toContain("cafe");
    expect(result.items[2].category).toBe("Đi lại");
    expect(result.items[2].source).toBe("Grab");
  });

  it("parses income with plus or thu prefix", () => {
    const result = quickParse("+ [Lương] 15000000 @Công ty\nthu: thưởng 2.500.000");
    expect(result.items[0].type).toBe("income");
    expect(result.items[0].category).toBe("Lương");
    expect(result.items[0].amount).toBe(15000000);
    expect(result.items[1].type).toBe("income");
    expect(result.items[1].amount).toBe(2500000);
  });

  it("handles amount tokens with commas and dots", () => {
    const result = quickParse("mua sắm 1,500,000\nđi chợ 1.200.000");
    expect(result.items[0].amount).toBe(1500000);
    expect(result.items[1].amount).toBe(1200000);
  });

  it("skips invalid lines", () => {
    const result = quickParse("không có tiền\nđi chơi -100\nhoàn tiền - 100k");
    expect(result.items).toHaveLength(0);
    expect(result.skipped).toHaveLength(3);
  });

  it("uses default category and desc", () => {
    const result = quickParse("50000");
    expect(result.items[0].category).toBe("Ăn uống");
    expect(result.items[0].desc).toBe("Ăn uống");
  });
});
