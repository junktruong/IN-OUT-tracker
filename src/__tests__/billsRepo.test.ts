import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;
let repo: typeof import("@/lib/repo/billsRepo");
const USER_ID = "google-user-a";
const OTHER_USER_ID = "google-user-b";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  repo = await import("@/lib/repo/billsRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("billsRepo", () => {
  it("creates a bill", async () => {
    const bill = await repo.upsertBill(USER_ID, {
      name: "Tiền nhà",
      amount: 5000000,
      cycleType: "monthly",
      cycleValue: 5,
    });
    expect(bill?.name).toBe("Tiền nhà");
  });

  it("updates a bill", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Internet",
      amount: 300000,
      cycleType: "monthly",
      cycleValue: 10,
    });
    const updated = await repo.upsertBill(USER_ID, {
      id: String(created?._id),
      name: "Internet Fiber",
      amount: 350000,
      cycleType: "weekly",
      cycleValue: 2,
    });
    expect(updated?.name).toBe("Internet Fiber");
    expect(updated?.cycleType).toBe("weekly");
  });

  it("clears optional fields when updating a bill", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Gói tập",
      amount: 500000,
      cycleType: "custom_days",
      cycleValue: 15,
      group: "Sức khoẻ",
      start: new Date("2024-05-01"),
      end: new Date("2024-12-31"),
      note: "Theo quý",
    });
    const updated = await repo.upsertBill(USER_ID, {
      id: String(created?._id),
      name: "Gói tập",
      amount: 500000,
      cycleType: "custom_days",
      cycleValue: 15,
    });

    expect(updated?.group).toBeUndefined();
    expect(updated?.start).toBeUndefined();
    expect(updated?.end).toBeUndefined();
    expect(updated?.note).toBeUndefined();
  });

  it("toggles paid status", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Gửi xe",
      amount: 150000,
      cycleType: "monthly",
      cycleValue: 8,
    });
    const updated = await repo.toggleBillPaid(
      USER_ID,
      String(created?._id),
      true,
      new Date("2024-05-01")
    );
    expect(updated?.paid).toBe(true);
    const reverted = await repo.toggleBillPaid(USER_ID, String(created?._id), false, null);
    expect(reverted?.paid).toBe(false);
  });

  it("confirms payment with details and can undo", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Điện",
      amount: 450000,
      cycleType: "monthly",
      cycleValue: 12,
    });
    const paid = await repo.payBill(
      USER_ID,
      String(created?._id),
      new Date("2024-05-10"),
      430000,
      "Đóng sớm"
    );
    expect(paid?.paid).toBe(true);
    expect(paid?.paidAmount).toBe(430000);
    expect(paid?.paidNote).toBe("Đóng sớm");
    const reverted = await repo.unpayBill(USER_ID, String(created?._id));
    expect(reverted?.paid).toBe(false);
    expect(reverted?.paidAt).toBeUndefined();
    expect(reverted?.paidAmount).toBeUndefined();
    expect(reverted?.paidNote).toBeUndefined();
  });

  it("lists bills", async () => {
    const list = await repo.listBills(USER_ID);
    expect(list.length).toBeGreaterThan(0);
  });

  it("deletes a bill", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Netflix",
      amount: 260000,
      cycleType: "monthly",
      cycleValue: 15,
    });
    const removed = await repo.deleteBillById(USER_ID, String(created?._id));
    expect(removed?.name).toBe("Netflix");
  });

  it("scopes bill reads and writes by user id", async () => {
    const otherBill = await repo.upsertBill(OTHER_USER_ID, {
      name: "Khoản riêng",
      amount: 100000,
      cycleType: "monthly",
      cycleValue: 9,
    });

    const userBills = await repo.listBills(USER_ID);
    const blockedUpdate = await repo.upsertBill(USER_ID, {
      id: String(otherBill?._id),
      name: "Không được sửa",
      amount: 200000,
      cycleType: "monthly",
      cycleValue: 10,
    });
    const blockedDelete = await repo.deleteBillById(USER_ID, String(otherBill?._id));

    expect(userBills.some((bill) => bill.name === "Khoản riêng")).toBe(false);
    expect(blockedUpdate).toBeNull();
    expect(blockedDelete).toBeNull();
  });
});
