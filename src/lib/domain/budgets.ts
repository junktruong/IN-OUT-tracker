import { z } from "zod";

export const budgetPeriods = ["weekly", "monthly", "yearly"] as const;
export type BudgetPeriod = (typeof budgetPeriods)[number];

export const budgetSchema = z.object({
  categoryId: z.string().min(1),
  amountLimit: z.number().positive(),
  period: z.enum(budgetPeriods),
});

export type BudgetInput = z.infer<typeof budgetSchema>;

export const budgetSyncOperationSchema = z
  .object({
    operationId: z.string().min(1).optional(),
    clientMutationId: z.string().min(1).optional(),
    type: z.literal("upsert"),
    payload: budgetSchema,
  })
  .superRefine((value, context) => {
    if (!value.operationId && !value.clientMutationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "operationId hoặc clientMutationId là bắt buộc.",
        path: ["operationId"],
      });
    }
  });

export const budgetSyncBatchSchema = z.object({
  operations: z.array(budgetSyncOperationSchema).min(1).max(100),
});

export type BudgetSyncOperationInput = z.infer<typeof budgetSyncOperationSchema>;
