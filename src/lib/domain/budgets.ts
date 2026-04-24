import { z } from "zod";

export const budgetPeriods = ["weekly", "monthly", "yearly"] as const;
export type BudgetPeriod = (typeof budgetPeriods)[number];

export const budgetSchema = z.object({
  categoryId: z.string().min(1),
  amountLimit: z.number().positive(),
  period: z.enum(budgetPeriods),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
