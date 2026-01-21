import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;
let repo: typeof import("@/lib/repo/billsRepo");

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
    const bill = await repo.upsertBill({
      name: "Tiền nhà",
      amount: 5000000,
      dueDay: 5,
    });
    expect(bill?.name).toBe("Tiền nhà");
  });

  it("updates a bill", async () => {
    const created = await repo.upsertBill({
      name: "Internet",
      amount: 300000,
      dueDay: 10,
    });
    const updated = await repo.upsertBill({
      id: String(created?._id),
      name: "Internet Fiber",
      amount: 350000,
      dueDay: 10,
    });
    expect(updated?.name).toBe("Internet Fiber");
  });

  it("toggles paid status", async () => {
    const created = await repo.upsertBill({
      name: "Gửi xe",
      amount: 150000,
      dueDay: 8,
    });
    const updated = await repo.toggleBillPaid(
      String(created?._id),
      true,
      new Date("2024-05-01")
    );
    expect(updated?.paid).toBe(true);
    const reverted = await repo.toggleBillPaid(String(created?._id), false, null);
    expect(reverted?.paid).toBe(false);
  });

  it("lists bills", async () => {
    const list = await repo.listBills();
    expect(list.length).toBeGreaterThan(0);
  });
});
