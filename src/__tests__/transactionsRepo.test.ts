import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { toYmd } from "@/lib/domain/date";

let mongo: MongoMemoryServer;
let repo: typeof import("@/lib/repo/transactionsRepo");

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  repo = await import("@/lib/repo/transactionsRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("transactionsRepo", () => {
  it("inserts transactions", async () => {
    const result = await repo.insertTransactions([
      {
        date: new Date("2024-05-10T10:00:00"),
        type: "expense",
        amount: 45000,
        category: "Ăn uống",
        desc: "Bún bò",
      },
    ]);
    expect(result.length).toBe(1);
  });

  it("queries by month", async () => {
    await repo.insertTransactions([
      {
        date: new Date("2024-06-05T00:00:00"),
        type: "income",
        amount: 1000000,
        category: "Lương",
        desc: "Thưởng",
      },
    ]);
    const items = await repo.getTransactionsByMonth("2024-06");
    expect(items.length).toBeGreaterThan(0);
  });

  it("queries by day", async () => {
    await repo.insertTransactions([
      {
        date: new Date("2024-07-02T08:00:00"),
        type: "expense",
        amount: 25000,
        category: "Cafe",
        desc: "Cà phê sáng",
      },
    ]);
    const items = await repo.getTransactionsByDay("2024-07-02");
    expect(items.length).toBeGreaterThan(0);
  });

  it("updates transaction by id", async () => {
    const [created] = await repo.insertTransactions([
      {
        date: new Date("2024-08-01T13:00:00"),
        type: "expense",
        amount: 20000,
        category: "Đi lại",
        desc: "Grab",
      },
    ]);
    const updated = await repo.updateTransactionById(String(created._id), {
      date: new Date("2024-08-02T09:00:00"),
      type: "expense",
      amount: 30000,
      category: "Đi lại",
      desc: "Grab bike",
    });
    expect(updated?.amount).toBe(30000);
    expect(toYmd(new Date(updated?.date ?? ""))).toBe("2024-08-02");
  });

  it("deletes transaction by id", async () => {
    const [created] = await repo.insertTransactions([
      {
        date: new Date("2024-09-01T13:00:00"),
        type: "income",
        amount: 500000,
        category: "Thu khác",
        desc: "Hoàn tiền",
      },
    ]);
    const removed = await repo.deleteTransactionById(String(created._id));
    expect(removed?.desc).toBe("Hoàn tiền");
  });
});
