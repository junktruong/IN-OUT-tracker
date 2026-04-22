import { connectToDatabase } from "@/lib/db/connect";
import { TransactionModel } from "@/lib/db/models";
import {
  parseMonthKey,
  startOfDay,
  startOfMonth,
  startOfNextMonth,
  startOfNextYear,
  startOfYear,
} from "@/lib/domain/date";

export type NewTransaction = {
  date: Date;
  type: "expense" | "income";
  amount: number;
  category: string;
  desc: string;
  source?: string;
  method?: string;
  account?: string;
  note?: string;
};

export type TransactionUpdate = {
  date: Date;
  type: "expense" | "income";
  amount: number;
  category: string;
  desc: string;
  source?: string;
  method?: string;
  account?: string;
  note?: string;
};

const normalizeDate = (date: Date) => startOfDay(date);

export const getTransactionsByMonth = async (userId: string, month: string) => {
  await connectToDatabase();
  const { year, month: monthValue } = parseMonthKey(month);
  const start = startOfMonth(new Date(year, monthValue - 1, 1));
  const end = startOfNextMonth(start);

  return TransactionModel.find({
    userId,
    date: { $gte: start, $lt: end },
  })
    .sort({ createdAt: 1 })
    .lean();
};

export const getTransactionsByYear = async (userId: string, year: number) => {
  await connectToDatabase();
  const start = startOfYear(new Date(year, 0, 1));
  const end = startOfNextYear(start);

  return TransactionModel.find({
    userId,
    date: { $gte: start, $lt: end },
  })
    .sort({ createdAt: 1 })
    .lean();
};

export const getTransactionsByDay = async (userId: string, day: string) => {
  await connectToDatabase();
  const start = startOfDay(new Date(`${day}T00:00:00`));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

  return TransactionModel.find({
    userId,
    date: { $gte: start, $lt: end },
  })
    .sort({ createdAt: 1 })
    .lean();
};

export const insertTransactions = async (userId: string, items: NewTransaction[]) => {
  await connectToDatabase();
  const normalized = items.map((item) => ({
    ...item,
    userId,
    date: normalizeDate(item.date),
  }));
  return TransactionModel.insertMany(normalized);
};

export const updateTransactionById = async (
  userId: string,
  id: string,
  payload: TransactionUpdate
) => {
  await connectToDatabase();
  return TransactionModel.findOneAndUpdate(
    { _id: id, userId },
    {
      date: normalizeDate(payload.date),
      type: payload.type,
      amount: payload.amount,
      category: payload.category,
      desc: payload.desc,
      source: payload.source,
      method: payload.method,
      account: payload.account,
      note: payload.note,
    },
    { new: true }
  ).lean();
};

export const deleteTransactionById = async (userId: string, id: string) => {
  await connectToDatabase();
  return TransactionModel.findOneAndDelete({ _id: id, userId }).lean();
};
