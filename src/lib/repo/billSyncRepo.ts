import { connectToDatabase } from "@/lib/db/connect";
import { SyncOperationModel } from "@/lib/db/models";
import { billPaySchema, billSchema, type BillSyncOperationInput } from "@/lib/domain/bills";
import {
  deleteBillById,
  getBillByClientId,
  payBill,
  unpayBill,
  upsertBill,
} from "@/lib/repo/billsRepo";

type SyncResult = {
  operationId: string;
  clientId: string;
  serverId?: string;
  status: "applied" | "duplicate" | "deleted";
};

const normalizeOperationId = (operation: BillSyncOperationInput) =>
  operation.operationId ?? operation.clientMutationId ?? "";

const rememberOperation = async (
  userId: string,
  operation: BillSyncOperationInput,
  result: SyncResult
) => {
  await SyncOperationModel.create({
    userId,
    entityType: "bill",
    mutationType: operation.type,
    operationId: result.operationId,
    clientId: result.clientId,
    serverId: result.serverId,
    status: result.status,
    createdAt: new Date(),
  });
};

export const syncBillOperations = async (
  userId: string,
  operations: BillSyncOperationInput[]
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
        status: processed.status === "deleted" ? "deleted" : "duplicate",
      });
      continue;
    }

    if (operation.type === "upsert") {
      const payload = billSchema.parse(operation.payload);
      const existing = await getBillByClientId(userId, operation.clientId);
      const saved = existing || operation.serverId
        ? await upsertBill(userId, {
            id: operation.serverId ?? operation.clientId,
            clientId: operation.clientId,
            name: payload.name,
            amount: payload.amount,
            cycleType: payload.cycleType,
            cycleValue: payload.cycleValue,
            group: payload.group,
            start: payload.start ? new Date(`${payload.start}T00:00:00`) : null,
            end: payload.end ? new Date(`${payload.end}T00:00:00`) : null,
            note: payload.note,
          })
        : await upsertBill(userId, {
            clientId: operation.clientId,
            name: payload.name,
            amount: payload.amount,
            cycleType: payload.cycleType,
            cycleValue: payload.cycleValue,
            group: payload.group,
            start: payload.start ? new Date(`${payload.start}T00:00:00`) : null,
            end: payload.end ? new Date(`${payload.end}T00:00:00`) : null,
            note: payload.note,
          });

      const result: SyncResult = {
        operationId,
        clientId: saved?.clientId ?? operation.clientId,
        serverId: saved?._id ? String(saved._id) : operation.serverId,
        status: "applied",
      };
      await rememberOperation(userId, operation, result);
      results.push(result);
      continue;
    }

    if (operation.type === "delete") {
      const removed = await deleteBillById(userId, operation.serverId ?? operation.clientId);
      const result: SyncResult = {
        operationId,
        clientId: operation.clientId,
        serverId: removed?._id ? String(removed._id) : operation.serverId,
        status: "deleted",
      };
      await rememberOperation(userId, operation, result);
      results.push(result);
      continue;
    }

    if (operation.type === "pay") {
      const payload = billPaySchema.parse(operation.payload);
      const updated = await payBill(
        userId,
        operation.serverId ?? operation.clientId,
        new Date(`${payload.paidAt}T00:00:00`),
        payload.paidAmount,
        payload.paidNote
      );

      const result: SyncResult = {
        operationId,
        clientId: updated?.clientId ?? operation.clientId,
        serverId: updated?._id ? String(updated._id) : operation.serverId,
        status: updated ? "applied" : "duplicate",
      };
      await rememberOperation(userId, operation, result);
      results.push(result);
      continue;
    }

    const updated = await unpayBill(userId, operation.serverId ?? operation.clientId);
    const result: SyncResult = {
      operationId,
      clientId: updated?.clientId ?? operation.clientId,
      serverId: updated?._id ? String(updated._id) : operation.serverId,
      status: updated ? "applied" : "duplicate",
    };
    await rememberOperation(userId, operation, result);
    results.push(result);
  }

  return results;
};
