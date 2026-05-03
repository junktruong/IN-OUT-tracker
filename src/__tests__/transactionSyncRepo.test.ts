import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;
let transactionsRepo: typeof import("@/lib/repo/transactionsRepo");
let syncRepo: typeof import("@/lib/repo/transactionSyncRepo");
const USER_ID = "google-user-sync";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  transactionsRepo = await import("@/lib/repo/transactionsRepo");
  syncRepo = await import("@/lib/repo/transactionSyncRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("transactionSyncRepo", () => {
  it("applies create only once for the same operation id", async () => {
    const operation = {
      operationId: "op-create-1",
      type: "create" as const,
      clientId: "client-tx-1",
      payload: {
        date: "2026-05-03",
        type: "expense" as const,
        amount: 45000,
        category: "Ăn uống",
        desc: "Bún bò",
      },
    };

    const first = await syncRepo.syncTransactionOperations(USER_ID, [operation]);
    const second = await syncRepo.syncTransactionOperations(USER_ID, [operation]);
    const items = await transactionsRepo.getTransactionsByMonth(USER_ID, "2026-05");

    expect(first[0]?.status).toBe("applied");
    expect(second[0]?.status).toBe("duplicate");
    expect(items).toHaveLength(1);
    expect(items[0]?.clientId).toBe("client-tx-1");
  });

  it("updates a transaction by clientId through sync operations", async () => {
    await syncRepo.syncTransactionOperations(USER_ID, [
      {
        operationId: "op-create-2",
        type: "create",
        clientId: "client-tx-2",
        payload: {
          date: "2026-05-04",
          type: "expense",
          amount: 20000,
          category: "Đi lại",
          desc: "Grab",
        },
      },
    ]);

    const updated = await syncRepo.syncTransactionOperations(USER_ID, [
      {
        operationId: "op-update-2",
        type: "update",
        clientId: "client-tx-2",
        payload: {
          date: "2026-05-04",
          type: "expense",
          amount: 30000,
          category: "Đi lại",
          desc: "Grab bike",
        },
      },
    ]);

    const items = await transactionsRepo.getTransactionsByMonth(USER_ID, "2026-05");
    const target = items.find((item) => item.clientId === "client-tx-2");

    expect(updated[0]?.status).toBe("applied");
    expect(target?.amount).toBe(30000);
    expect(target?.desc).toBe("Grab bike");
  });
});
