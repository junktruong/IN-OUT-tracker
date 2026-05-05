import { connectToDatabase } from "@/lib/db/connect";
import { CategoryModel } from "@/lib/db/models";
import {
  defaultCategorySeeds,
  toCategorySlug,
  type CategoryInput,
} from "@/lib/domain/categories";

export const ensureDefaultCategories = async (userId: string) => {
  await connectToDatabase();

  await Promise.all(
    defaultCategorySeeds.map((seed) =>
      CategoryModel.findOneAndUpdate(
        { userId, slug: seed.slug, categoryType: seed.categoryType },
        {
          $setOnInsert: {
            userId,
            name: seed.name,
            slug: seed.slug,
            icon: seed.icon,
            categoryType: seed.categoryType,
            kind: "system",
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true }
      )
    )
  );
};

export const listCategories = async (userId: string) => {
  await ensureDefaultCategories(userId);

  return CategoryModel.find({ userId })
    .sort({ categoryType: 1, kind: 1, name: 1 })
    .lean();
};

export const getCategoryById = async (userId: string, id: string) => {
  await ensureDefaultCategories(userId);
  return CategoryModel.findOne({ _id: id, userId }).lean();
};

export const getCategoryByClientId = async (userId: string, clientId: string) => {
  await ensureDefaultCategories(userId);
  return CategoryModel.findOne({ userId, clientId }).lean();
};

export const createCategory = async (
  userId: string,
  payload: CategoryInput & { clientId?: string }
) => {
  await ensureDefaultCategories(userId);

  const slug = toCategorySlug(payload.name);
  const existing = await CategoryModel.findOne({
    userId,
    slug,
    categoryType: payload.categoryType,
  }).lean();

  if (existing) {
    return { kind: "duplicate" as const, category: existing };
  }

  const created = await CategoryModel.create({
    userId,
    clientId: payload.clientId,
    name: payload.name.trim(),
    slug,
    icon: payload.icon ?? "✨",
    categoryType: payload.categoryType,
    kind: "custom",
    updatedAt: new Date(),
  });

  return { kind: "created" as const, category: created.toObject() };
};
