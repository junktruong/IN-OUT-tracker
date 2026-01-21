import { z } from "zod";

export const billSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    amount: z.number().positive(),
    dueDay: z.number().int().min(1).max(31),
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
  );

export type BillInput = z.infer<typeof billSchema>;
