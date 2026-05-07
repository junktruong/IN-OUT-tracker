import { connectToDatabase } from "@/lib/db/connect";
import { SyncOperationModel } from "@/lib/db/models";
import type { BudgetSyncOperationInput } from "@/lib/domain/budgets";
import { upsertBudget } from "@/lib/repo/budgetsRepo";

type SyncResult = {
  operationId: string;
  status: "applied" | "duplicate";
};

const normalizeOperationId = (operation: BudgetSyncOperationInput) =>
  operation.operationId ?? operation.clientMutationId ?? "";

export const syncBudgetOperations = async (
  userId: string,
  operations: BudgetSyncOperationInput[]
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

    await upsertBudget(userId, operation.payload);
    await SyncOperationModel.create({
      userId,
      entityType: "budget",
      mutationType: operation.type,
      operationId,
      status: "applied",
      createdAt: new Date(),
    });

    results.push({ operationId, status: "applied" });
  }

  return results;
};
