import { z } from "zod";

export const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["expense", "income"]),
  amount: z.number().positive(),
  categoryId: z.string().optional(),
  category: z.string().min(1),
  desc: z.string().min(1),
  source: z.string().optional(),
  method: z.string().optional(),
  account: z.string().optional(),
  note: z.string().optional(),
});

export const transactionSyncOperationSchema = z
  .object({
    operationId: z.string().min(1).optional(),
    clientMutationId: z.string().min(1).optional(),
    type: z.enum(["create", "update", "delete"]),
    clientId: z.string().min(1),
    serverId: z.string().optional(),
    payload: transactionSchema.optional(),
  })
  .superRefine((value, context) => {
    if (!value.operationId && !value.clientMutationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "operationId hoặc clientMutationId là bắt buộc.",
        path: ["operationId"],
      });
    }

    if ((value.type === "create" || value.type === "update") && !value.payload) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payload là bắt buộc với create/update.",
        path: ["payload"],
      });
    }
  });

export const transactionSyncBatchSchema = z.object({
  operations: z.array(transactionSyncOperationSchema).min(1).max(100),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionSyncOperationInput = z.infer<typeof transactionSyncOperationSchema>;
