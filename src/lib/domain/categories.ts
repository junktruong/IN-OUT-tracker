import { z } from "zod";

export const categoryTypes = ["expense", "income"] as const;
export const categoryKinds = ["system", "custom"] as const;

export type CategoryType = (typeof categoryTypes)[number];
export type CategoryKind = (typeof categoryKinds)[number];

export const defaultCategorySeeds = [
  { slug: "an-uong", name: "Ăn uống", icon: "🍜", categoryType: "expense" },
  { slug: "di-choi", name: "Đi chơi", icon: "🎉", categoryType: "expense" },
  { slug: "xang-xe-di-lai", name: "Xăng xe đi lại", icon: "⛽", categoryType: "expense" },
  { slug: "dich-vu", name: "Dịch vụ", icon: "🧾", categoryType: "expense" },
  { slug: "khac", name: "Khác", icon: "✨", categoryType: "expense" },
  { slug: "luong", name: "Lương", icon: "💼", categoryType: "income" },
  { slug: "thuong", name: "Thưởng", icon: "🎁", categoryType: "income" },
  { slug: "hoan-tien", name: "Hoàn tiền", icon: "💳", categoryType: "income" },
  { slug: "thu-khac", name: "Thu khác", icon: "💰", categoryType: "income" },
] as const satisfies ReadonlyArray<{
  slug: string;
  name: string;
  icon: string;
  categoryType: CategoryType;
}>;

export const categorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1).max(8).optional(),
  categoryType: z.enum(categoryTypes),
});

export const categorySyncOperationSchema = z
  .object({
    operationId: z.string().min(1).optional(),
    clientMutationId: z.string().min(1).optional(),
    type: z.literal("create"),
    clientId: z.string().min(1),
    payload: categorySchema,
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

export const categorySyncBatchSchema = z.object({
  operations: z.array(categorySyncOperationSchema).min(1).max(100),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type CategorySyncOperationInput = z.infer<typeof categorySyncOperationSchema>;

export const toCategorySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
