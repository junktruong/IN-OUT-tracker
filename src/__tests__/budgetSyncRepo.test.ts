import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;
let budgetsRepo: typeof import("@/lib/repo/budgetsRepo");
let syncRepo: typeof import("@/lib/repo/budgetSyncRepo");
const USER_ID = "google-user-budget-sync";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  budgetsRepo = await import("@/lib/repo/budgetsRepo");
  syncRepo = await import("@/lib/repo/budgetSyncRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("budgetSyncRepo", () => {
  it("applies upsert only once for the same operation id", async () => {
    const operation = {
      operationId: "op-budget-1",
      type: "upsert" as const,
      payload: {
        categoryId: "category-sync-1",
        amountLimit: 250000,
        period: "weekly" as const,
      },
    };

    const first = await syncRepo.syncBudgetOperations(USER_ID, [operation]);
    const second = await syncRepo.syncBudgetOperations(USER_ID, [operation]);
    const items = await budgetsRepo.listBudgets(USER_ID);
    const matches = items.filter(
      (item) => item.categoryId === "category-sync-1" && item.period === "weekly"
    );

    expect(first[0]?.status).toBe("applied");
    expect(second[0]?.status).toBe("duplicate");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.amountLimit).toBe(250000);
  });
});
