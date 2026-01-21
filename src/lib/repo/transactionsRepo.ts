import { connectToDatabase } from "@/lib/db/connect";
import { TransactionModel } from "@/lib/db/models";
import { parseMonthKey, startOfDay, startOfMonth, startOfNextMonth } from "@/lib/domain/date";

export type NewTransaction = {
  date: Date;
  type: "expense" | "income";
  amount: number;
  category: string;
  desc: string;
  source?: string;
};

const normalizeDate = (date: Date) => startOfDay(date);

export const getTransactionsByMonth = async (month: string) => {
  await connectToDatabase();
  const { year, month: monthValue } = parseMonthKey(month);
  const start = startOfMonth(new Date(year, monthValue - 1, 1));
  const end = startOfNextMonth(start);

  return TransactionModel.find({
    date: { $gte: start, $lt: end },
  })
    .sort({ createdAt: 1 })
    .lean();
};

export const insertTransactions = async (items: NewTransaction[]) => {
  await connectToDatabase();
  const normalized = items.map((item) => ({
    ...item,
    date: normalizeDate(item.date),
  }));
  return TransactionModel.insertMany(normalized);
};
