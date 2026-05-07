import { z } from "zod";

export const billCycleTypes = ["monthly", "weekly", "custom_days"] as const;
export type BillCycleType = (typeof billCycleTypes)[number];

export const billPaySchema = z.object({
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidAmount: z.number().positive().optional(),
  paidNote: z.string().optional(),
});

export const billSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    amount: z.number().positive(),
    cycleType: z.enum(billCycleTypes),
    cycleValue: z.number().int().positive(),
    group: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    note: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.start || !data.end) {
        return true;
      }
      return new Date(`${data.start}T00:00:00`) <= new Date(`${data.end}T00:00:00`);
    },
    { message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.", path: ["end"] }
  )
  .refine(
    (data) => {
      if (data.cycleType === "monthly") {
        return data.cycleValue >= 1 && data.cycleValue <= 31;
      }
      if (data.cycleType === "weekly") {
        return data.cycleValue >= 1 && data.cycleValue <= 7;
      }
      return data.cycleValue >= 1 && data.cycleValue <= 3650;
    },
    {
      message:
        "Chu kỳ không hợp lệ. Hàng tháng dùng ngày 1-31, hàng tuần dùng thứ 1-7, tuỳ chỉnh dùng số ngày.",
      path: ["cycleValue"],
    }
  );

export type BillInput = z.infer<typeof billSchema>;
export type BillPayInput = z.infer<typeof billPaySchema>;

export const billSyncOperationSchema = z
  .object({
    operationId: z.string().min(1).optional(),
    clientMutationId: z.string().min(1).optional(),
    type: z.enum(["upsert", "delete", "pay", "unpay"]),
    clientId: z.string().min(1),
    serverId: z.string().optional(),
    payload: z.union([billSchema, billPaySchema]).optional(),
  })
  .superRefine((value, context) => {
    if (!value.operationId && !value.clientMutationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "operationId hoặc clientMutationId là bắt buộc.",
        path: ["operationId"],
      });
    }

    if (value.type === "upsert") {
      const parsed = billSchema.safeParse(value.payload);
      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "payload upsert không hợp lệ.",
          path: ["payload"],
        });
      }
    }

    if (value.type === "pay") {
      const parsed = billPaySchema.safeParse(value.payload);
      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "payload pay không hợp lệ.",
          path: ["payload"],
        });
      }
    }
  });

export const billSyncBatchSchema = z.object({
  operations: z.array(billSyncOperationSchema).min(1).max(100),
});

export type BillSyncOperationInput = z.infer<typeof billSyncOperationSchema>;
