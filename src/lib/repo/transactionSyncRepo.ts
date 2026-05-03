import { connectToDatabase } from "@/lib/db/connect";
import { SyncOperationModel } from "@/lib/db/models";
import type { TransactionSyncOperationInput } from "@/lib/domain/transactions";
import {
  deleteTransactionById,
  getTransactionByClientId,
  upsertTransactionByClientId,
  updateTransactionById,
} from "@/lib/repo/transactionsRepo";

type SyncResult = {
  operationId: string;
  clientId: string;
  serverId?: string;
  status: "applied" | "duplicate" | "deleted";
};

const normalizeOperationId = (operation: TransactionSyncOperationInput) =>
  operation.operationId ?? operation.clientMutationId ?? "";

const rememberOperation = async (
  userId: string,
  operation: TransactionSyncOperationInput,
  result: SyncResult
) => {
  await SyncOperationModel.create({
    userId,
    entityType: "transaction",
    mutationType: operation.type,
    operationId: result.operationId,
    clientId: result.clientId,
    serverId: result.serverId,
    status: result.status,
  });
};

export const syncTransactionOperations = async (
  userId: string,
  operations: TransactionSyncOperationInput[]
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

    if (operation.type === "create") {
      const existing = await getTransactionByClientId(userId, operation.clientId);

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

      const payload = operation.payload!;
      const created = await upsertTransactionByClientId(userId, {
        ...payload,
        clientId: operation.clientId,
        date: new Date(`${payload.date}T00:00:00`),
      });

      const createResult: SyncResult = {
        operationId,
        clientId: created?.clientId ?? operation.clientId,
        serverId: created?._id ? String(created._id) : undefined,
        status: "applied",
      };
      await rememberOperation(userId, operation, createResult);
      results.push(createResult);
      continue;
    }

    if (operation.type === "update") {
      const payload = operation.payload!;
      const updated = await updateTransactionById(
        userId,
        operation.serverId ?? operation.clientId,
        {
          ...payload,
          clientId: operation.clientId,
          date: new Date(`${payload.date}T00:00:00`),
        }
      );

      if (!updated) {
        throw new Error(`Transaction ${operation.clientId} not found for update sync`);
      }

      const updateResult: SyncResult = {
        operationId,
        clientId: updated.clientId ?? operation.clientId,
        serverId: String(updated._id),
        status: "applied",
      };
      await rememberOperation(userId, operation, updateResult);
      results.push(updateResult);
      continue;
    }

    const removed = await deleteTransactionById(userId, operation.serverId ?? operation.clientId);

    const deleteResult: SyncResult = {
      operationId,
      clientId: operation.clientId,
      serverId: removed?._id ? String(removed._id) : operation.serverId,
      status: "deleted",
    };
    await rememberOperation(userId, operation, deleteResult);
    results.push(deleteResult);
  }

  return results;
};
