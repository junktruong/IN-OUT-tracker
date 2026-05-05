import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;
let categoriesRepo: typeof import("@/lib/repo/categoriesRepo");
let syncRepo: typeof import("@/lib/repo/categorySyncRepo");
const USER_ID = "google-user-category-sync";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  categoriesRepo = await import("@/lib/repo/categoriesRepo");
  syncRepo = await import("@/lib/repo/categorySyncRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("categorySyncRepo", () => {
  it("applies create only once for the same operation id", async () => {
    const operation = {
      operationId: "op-category-create-1",
      type: "create" as const,
      clientId: "client-category-1",
      payload: {
        name: "Cafe specialty",
        icon: "☕",
        categoryType: "expense" as const,
      },
    };

    const first = await syncRepo.syncCategoryOperations(USER_ID, [operation]);
    const second = await syncRepo.syncCategoryOperations(USER_ID, [operation]);
    const items = await categoriesRepo.listCategories(USER_ID);
    const matches = items.filter((item) => item.name === "Cafe specialty");

    expect(first[0]?.status).toBe("applied");
    expect(second[0]?.status).toBe("duplicate");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.clientId).toBe("client-category-1");
  });
});
