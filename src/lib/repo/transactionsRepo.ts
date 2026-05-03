import mongoose from "mongoose";

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
  clientId?: string;
  date: Date;
  type: "expense" | "income";
  amount: number;
  categoryId?: string;
  category: string;
  desc: string;
  source?: string;
  method?: string;
  account?: string;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TransactionUpdate = {
  clientId?: string;
  date: Date;
  type: "expense" | "income";
  amount: number;
  categoryId?: string;
  category: string;
  desc: string;
  source?: string;
  method?: string;
  account?: string;
  note?: string;
};

const normalizeDate = (date: Date) => startOfDay(date);

const getTransactionIdentifierQuery = (id: string) => {
  if (mongoose.isValidObjectId(id)) {
    return { $or: [{ _id: id }, { clientId: id }] };
  }

  return { clientId: id };
};

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

export const getTransactionByClientId = async (userId: string, clientId: string) => {
  await connectToDatabase();
  return TransactionModel.findOne({ userId, clientId }).lean();
};

export const insertTransactions = async (userId: string, items: NewTransaction[]) => {
  await connectToDatabase();
  const normalized = items.map((item) => ({
    ...item,
    userId,
    date: normalizeDate(item.date),
    createdAt: item.createdAt ?? new Date(),
    updatedAt: item.updatedAt ?? new Date(),
  }));
  return TransactionModel.insertMany(normalized);
};

export const upsertTransactionByClientId = async (userId: string, payload: NewTransaction) => {
  await connectToDatabase();
  if (!payload.clientId) {
    throw new Error("clientId is required for upsertTransactionByClientId");
  }

  return TransactionModel.findOneAndUpdate(
    { userId, clientId: payload.clientId },
    {
      $set: {
        date: normalizeDate(payload.date),
        type: payload.type,
        amount: payload.amount,
        categoryId: payload.categoryId,
        category: payload.category,
        desc: payload.desc,
        source: payload.source,
        method: payload.method,
        account: payload.account,
        note: payload.note,
        updatedAt: payload.updatedAt ?? new Date(),
      },
      $setOnInsert: {
        userId,
        clientId: payload.clientId,
        createdAt: payload.createdAt ?? new Date(),
      },
    },
    { upsert: true, new: true }
  ).lean();
};

export const updateTransactionById = async (
  userId: string,
  id: string,
  payload: TransactionUpdate
) => {
  await connectToDatabase();
  const nextPayload = {
    date: normalizeDate(payload.date),
    type: payload.type,
    amount: payload.amount,
    ...(payload.clientId ? { clientId: payload.clientId } : {}),
    categoryId: payload.categoryId,
    category: payload.category,
    desc: payload.desc,
    source: payload.source,
    method: payload.method,
    account: payload.account,
    note: payload.note,
    updatedAt: new Date(),
  };

  return TransactionModel.findOneAndUpdate(
    { userId, ...getTransactionIdentifierQuery(id) },
    nextPayload,
    { new: true }
  ).lean();
};

export const deleteTransactionById = async (userId: string, id: string) => {
  await connectToDatabase();
  return TransactionModel.findOneAndDelete({
    userId,
    ...getTransactionIdentifierQuery(id),
  }).lean();
};
