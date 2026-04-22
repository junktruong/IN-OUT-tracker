import { z } from "zod";

export const billCycleTypes = ["monthly", "weekly", "custom_days"] as const;
export type BillCycleType = (typeof billCycleTypes)[number];

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
