import { connectToDatabase } from "@/lib/db/connect";
import { SettingsModel } from "@/lib/db/models";

export type SettingsPayload = {
  paydayDay: number;
  salaryExpected: number;
};

export const getSettings = async () => {
  await connectToDatabase();
  const existing = await SettingsModel.findOne().lean();
  if (existing) {
    return existing;
  }
  const created = await SettingsModel.create({ paydayDay: 25, salaryExpected: 0 });
  return created.toObject();
};

export const updateSettings = async (payload: SettingsPayload) => {
  await connectToDatabase();
  const existing = await SettingsModel.findOne();
  if (existing) {
    existing.paydayDay = payload.paydayDay;
    existing.salaryExpected = payload.salaryExpected;
    await existing.save();
    return existing.toObject();
  }
  const created = await SettingsModel.create(payload);
  return created.toObject();
};
