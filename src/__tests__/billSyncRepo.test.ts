import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;
let billsRepo: typeof import("@/lib/repo/billsRepo");
let syncRepo: typeof import("@/lib/repo/billSyncRepo");
const USER_ID = "google-user-bill-sync";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  billsRepo = await import("@/lib/repo/billsRepo");
  syncRepo = await import("@/lib/repo/billSyncRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("billSyncRepo", () => {
  it("applies upsert only once for the same operation id", async () => {
    const operation = {
      operationId: "op-bill-create-1",
      type: "upsert" as const,
      clientId: "client-bill-1",
      payload: {
        name: "Tien dien",
        amount: 450000,
        cycleType: "monthly" as const,
        cycleValue: 12,
      },
    };

    const first = await syncRepo.syncBillOperations(USER_ID, [operation]);
    const second = await syncRepo.syncBillOperations(USER_ID, [operation]);
    const items = await billsRepo.listBills(USER_ID);
    const matches = items.filter((item) => item.clientId === "client-bill-1");

    expect(first[0]?.status).toBe("applied");
    expect(second[0]?.status).toBe("duplicate");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.name).toBe("Tien dien");
  });

  it("can create then confirm payment through sync operations", async () => {
    await syncRepo.syncBillOperations(USER_ID, [
      {
        operationId: "op-bill-create-2",
        type: "upsert",
        clientId: "client-bill-2",
        payload: {
          name: "Tien nuoc",
          amount: 180000,
          cycleType: "monthly",
          cycleValue: 15,
        },
      },
    ]);

    const paid = await syncRepo.syncBillOperations(USER_ID, [
      {
        operationId: "op-bill-pay-2",
        type: "pay",
        clientId: "client-bill-2",
        payload: {
          paidAt: "2026-05-07",
          paidAmount: 180000,
        },
      },
    ]);

    const items = await billsRepo.listBills(USER_ID);
    const target = items.find((item) => item.clientId === "client-bill-2");

    expect(paid[0]?.status).toBe("applied");
    expect(target?.paid).toBe(true);
    expect(target?.paidAmount).toBe(180000);
  });
});
