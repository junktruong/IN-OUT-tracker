import { z } from "zod";

export const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["expense", "income"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  desc: z.string().min(1),
  source: z.string().optional(),
  method: z.string().optional(),
  account: z.string().optional(),
  note: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
