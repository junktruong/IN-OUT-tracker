import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;
let settingsRepo: typeof import("@/lib/repo/settingsRepo");
let syncRepo: typeof import("@/lib/repo/settingsSyncRepo");
const USER_ID = "google-user-settings-sync";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  settingsRepo = await import("@/lib/repo/settingsRepo");
  syncRepo = await import("@/lib/repo/settingsSyncRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("settingsSyncRepo", () => {
  it("applies upsert only once for the same operation id", async () => {
    const operation = {
      operationId: "op-settings-1",
      type: "upsert" as const,
      payload: {
        paydayDay: 28,
        salaryExpected: 18000000,
      },
    };

    const first = await syncRepo.syncSettingsOperations(USER_ID, [operation]);
    const second = await syncRepo.syncSettingsOperations(USER_ID, [operation]);
    const settings = await settingsRepo.getSettings(USER_ID);

    expect(first[0]?.status).toBe("applied");
    expect(second[0]?.status).toBe("duplicate");
    expect(settings.paydayDay).toBe(28);
    expect(settings.salaryExpected).toBe(18000000);
  });
});
