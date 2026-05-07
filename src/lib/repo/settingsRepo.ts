import { connectToDatabase } from "@/lib/db/connect";
import { SettingsModel } from "@/lib/db/models";

export type SettingsPayload = {
  paydayDay: number;
  salaryExpected: number;
};

export const getSettings = async (userId: string) => {
  await connectToDatabase();
  const existing = await SettingsModel.findOne({ userId }).lean();
  if (existing) {
    return existing;
  }
  const created = await SettingsModel.create({
    userId,
    paydayDay: 25,
    salaryExpected: 0,
    updatedAt: new Date(),
  });
  return created.toObject();
};

export const updateSettings = async (userId: string, payload: SettingsPayload) => {
  await connectToDatabase();
  const existing = await SettingsModel.findOne({ userId });
  if (existing) {
    existing.paydayDay = payload.paydayDay;
    existing.salaryExpected = payload.salaryExpected;
    existing.updatedAt = new Date();
    await existing.save();
    return existing.toObject();
  }
  const created = await SettingsModel.create({ userId, ...payload, updatedAt: new Date() });
  return created.toObject();
};
