import { connectToDatabase } from "@/lib/db/connect";
import { SyncOperationModel } from "@/lib/db/models";
import type { CategorySyncOperationInput } from "@/lib/domain/categories";
import { createCategory, getCategoryByClientId } from "@/lib/repo/categoriesRepo";

type SyncResult = {
  operationId: string;
  clientId: string;
  serverId?: string;
  status: "applied" | "duplicate";
};

const normalizeOperationId = (operation: CategorySyncOperationInput) =>
  operation.operationId ?? operation.clientMutationId ?? "";

const rememberOperation = async (
  userId: string,
  operation: CategorySyncOperationInput,
  result: SyncResult
) => {
  await SyncOperationModel.create({
    userId,
    entityType: "category",
    mutationType: operation.type,
    operationId: result.operationId,
    clientId: result.clientId,
    serverId: result.serverId,
    status: result.status,
  });
};

export const syncCategoryOperations = async (
  userId: string,
  operations: CategorySyncOperationInput[]
) => {
  await connectToDatabase();

  const results: SyncResult[] = [];

  for (const operation of operations) {
    const operationId = normalizeOperationId(operation);
    const processed = await SyncOperationModel.findOne({ userId, operationId }).lean();

    if (processed) {
      results.push({
        operationId,
        clientId: processed.clientId ?? operation.clientId,
        serverId: processed.serverId ?? undefined,
        status: "duplicate",
      });
      continue;
    }

    const existing = await getCategoryByClientId(userId, operation.clientId);
    if (existing) {
      const duplicateResult: SyncResult = {
        operationId,
        clientId: existing.clientId ?? operation.clientId,
        serverId: String(existing._id),
        status: "duplicate",
      };
      await rememberOperation(userId, operation, duplicateResult);
      results.push(duplicateResult);
      continue;
    }

    const created = await createCategory(userId, {
      ...operation.payload,
      clientId: operation.clientId,
    });

    const result: SyncResult = {
      operationId,
      clientId: created.category.clientId ?? operation.clientId,
      serverId: created.category._id ? String(created.category._id) : undefined,
      status: created.kind === "created" ? "applied" : "duplicate",
    };

    await rememberOperation(userId, operation, result);
    results.push(result);
  }

  return results;
};
