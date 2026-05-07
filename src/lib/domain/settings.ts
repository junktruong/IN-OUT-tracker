import { z } from "zod";

export const settingsSchema = z.object({
  paydayDay: z.number().int().min(1).max(31),
  salaryExpected: z.number().min(0),
});

export const settingsSyncOperationSchema = z
  .object({
    operationId: z.string().min(1).optional(),
    clientMutationId: z.string().min(1).optional(),
    type: z.literal("upsert"),
    payload: settingsSchema,
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

export const settingsSyncBatchSchema = z.object({
  operations: z.array(settingsSyncOperationSchema).min(1).max(100),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type SettingsSyncOperationInput = z.infer<typeof settingsSyncOperationSchema>;
