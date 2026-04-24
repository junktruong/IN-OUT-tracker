import {
  addDays,
  startOfMonth,
  startOfNextMonth,
  startOfNextYear,
  startOfWeek,
  startOfYear,
} from "@/lib/domain/date";
import { connectToDatabase } from "@/lib/db/connect";
import { BudgetModel, CategoryModel, TransactionModel } from "@/lib/db/models";
import type { BudgetInput, BudgetPeriod } from "@/lib/domain/budgets";

const getBudgetWindow = (period: BudgetPeriod, now = new Date()) => {
  if (period === "weekly") {
    const start = startOfWeek(now);
    return { start, end: addDays(start, 7), label: "tuần này" };
  }

  if (period === "yearly") {
    const start = startOfYear(now);
    return { start, end: startOfNextYear(start), label: "năm nay" };
  }

  const start = startOfMonth(now);
  return { start, end: startOfNextMonth(start), label: "tháng này" };
};

const getSpentAmount = async (
  userId: string,
  categoryId: string,
  categoryName: string,
  period: BudgetPeriod
) => {
  const { start, end } = getBudgetWindow(period);
  const [usage] = await TransactionModel.aggregate<{ total: number }>([
    {
      $match: {
        userId,
        type: "expense",
        date: { $gte: start, $lt: end },
        $or: [{ categoryId }, { category: categoryName }],
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return usage?.total ?? 0;
};

export const listBudgets = async (userId: string) => {
  await connectToDatabase();
  return BudgetModel.find({ userId }).sort({ period: 1, updatedAt: -1 }).lean();
};

export const upsertBudget = async (userId: string, payload: BudgetInput) => {
  await connectToDatabase();

  return BudgetModel.findOneAndUpdate(
    { userId, categoryId: payload.categoryId, period: payload.period },
    {
      $set: {
        amountLimit: payload.amountLimit,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        userId,
        categoryId: payload.categoryId,
        period: payload.period,
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true }
  ).lean();
};

export const getBudgetAlerts = async (userId: string) => {
  await connectToDatabase();

  const budgets = await BudgetModel.find({ userId }).lean();
  if (budgets.length === 0) {
    return [];
  }

  const categories = await CategoryModel.find({
    userId,
    _id: { $in: budgets.map((budget) => budget.categoryId) },
  }).lean();

  const categoryMap = new Map(categories.map((category) => [String(category._id), category]));
  const alerts = [];

  for (const budget of budgets) {
    const category = categoryMap.get(budget.categoryId);
    if (!category) {
      continue;
    }

    const { label } = getBudgetWindow(budget.period);
    const spent = await getSpentAmount(userId, budget.categoryId, category.name, budget.period);
    const ratio = budget.amountLimit > 0 ? spent / budget.amountLimit : 0;

    if (ratio < 0.8) {
      continue;
    }

    alerts.push({
      id: `${budget.categoryId}:${budget.period}`,
      categoryId: budget.categoryId,
      categoryName: category.name,
      categoryIcon: category.icon,
      spent,
      amountLimit: budget.amountLimit,
      remaining: budget.amountLimit - spent,
      ratio,
      period: budget.period,
      periodLabel: label,
    });
  }

  return alerts.sort((a, b) => b.ratio - a.ratio);
};

export const listBudgetsWithProgress = async (userId: string, period?: BudgetPeriod) => {
  await connectToDatabase();

  const query = period ? { userId, period } : { userId };
  const budgets = await BudgetModel.find(query).sort({ period: 1, updatedAt: -1 }).lean();
  if (budgets.length === 0) {
    return [];
  }

  const categories = await CategoryModel.find({
    userId,
    _id: { $in: budgets.map((budget) => budget.categoryId) },
  }).lean();
  const categoryMap = new Map(categories.map((category) => [String(category._id), category]));

  const items = await Promise.all(
    budgets.map(async (budget) => {
      const category = categoryMap.get(budget.categoryId);
      if (!category) {
        return null;
      }

      const spent = await getSpentAmount(userId, budget.categoryId, category.name, budget.period);
      const { label } = getBudgetWindow(budget.period);

      return {
        id: String(budget._id),
        categoryId: budget.categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
        amountLimit: budget.amountLimit,
        spent,
        remaining: budget.amountLimit - spent,
        ratio: budget.amountLimit > 0 ? spent / budget.amountLimit : 0,
        period: budget.period,
        periodLabel: label,
      };
    })
  );

  return items.filter((item): item is NonNullable<typeof item> => item !== null);
};
