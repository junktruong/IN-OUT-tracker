import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;
let repo: typeof import("@/lib/repo/settingsRepo");
const USER_ID = "google-user-a";
const OTHER_USER_ID = "google-user-b";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  repo = await import("@/lib/repo/settingsRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("settingsRepo", () => {
  it("creates default settings for a user", async () => {
    const settings = await repo.getSettings(USER_ID);

    expect(settings.paydayDay).toBe(25);
    expect(settings.salaryExpected).toBe(0);
  });

  it("updates settings for the current user only", async () => {
    await repo.updateSettings(USER_ID, { paydayDay: 20, salaryExpected: 25000000 });
    await repo.updateSettings(OTHER_USER_ID, { paydayDay: 10, salaryExpected: 10000000 });

    const userSettings = await repo.getSettings(USER_ID);
    const otherSettings = await repo.getSettings(OTHER_USER_ID);

    expect(userSettings.paydayDay).toBe(20);
    expect(userSettings.salaryExpected).toBe(25000000);
    expect(otherSettings.paydayDay).toBe(10);
    expect(otherSettings.salaryExpected).toBe(10000000);
  });
});
