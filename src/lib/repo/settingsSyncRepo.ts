import { connectToDatabase } from "@/lib/db/connect";
import { SyncOperationModel } from "@/lib/db/models";
import type { SettingsSyncOperationInput } from "@/lib/domain/settings";
import { updateSettings } from "@/lib/repo/settingsRepo";

type SyncResult = {
  operationId: string;
  status: "applied" | "duplicate";
};

const normalizeOperationId = (operation: SettingsSyncOperationInput) =>
  operation.operationId ?? operation.clientMutationId ?? "";

export const syncSettingsOperations = async (
  userId: string,
  operations: SettingsSyncOperationInput[]
) => {
  await connectToDatabase();

  const results: SyncResult[] = [];

  for (const operation of operations) {
    const operationId = normalizeOperationId(operation);
    const processed = await SyncOperationModel.findOne({ userId, operationId }).lean();

    if (processed) {
      results.push({ operationId, status: "duplicate" });
      continue;
    }

    await updateSettings(userId, operation.payload);
    await SyncOperationModel.create({
      userId,
      entityType: "settings",
      mutationType: operation.type,
      operationId,
      status: "applied",
      createdAt: new Date(),
    });

    results.push({ operationId, status: "applied" });
  }

  return results;
};
