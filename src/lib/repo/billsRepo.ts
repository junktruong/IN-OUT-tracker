import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/connect";
import { BillModel } from "@/lib/db/models";
import type { BillCycleType } from "@/lib/domain/bills";

export type BillPayload = {
  id?: string;
  clientId?: string;
  name: string;
  amount: number;
  cycleType: BillCycleType;
  cycleValue: number;
  group?: string;
  start?: Date | null;
  end?: Date | null;
  note?: string;
};

const getBillIdentifierQuery = (id: string) => {
  if (mongoose.isValidObjectId(id)) {
    return { $or: [{ _id: id }, { clientId: id }] };
  }

  return { clientId: id };
};

const optionalBillFields = (payload: BillPayload) => {
  const $set: Record<string, string | Date> = {};
  const $unset: Record<string, ""> = {};

  const setOrUnset = (key: "group" | "start" | "end" | "note", value?: string | Date | null) => {
    if (value === undefined || value === null || value === "") {
      $unset[key] = "";
      return;
    }
    $set[key] = value;
  };

  setOrUnset("group", payload.group);
  setOrUnset("start", payload.start);
  setOrUnset("end", payload.end);
  setOrUnset("note", payload.note);

  return { $set, $unset };
};

export const listBills = async (userId: string) => {
  await connectToDatabase();
  return BillModel.find({ userId }).sort({ cycleType: 1, cycleValue: 1 }).lean();
};

export const upsertBill = async (userId: string, payload: BillPayload) => {
  await connectToDatabase();
  if (payload.id) {
    const optional = optionalBillFields(payload);
    return BillModel.findOneAndUpdate(
      { userId, ...getBillIdentifierQuery(payload.id) },
      {
        $set: {
          name: payload.name,
          amount: payload.amount,
          cycleType: payload.cycleType,
          cycleValue: payload.cycleValue,
          ...(payload.clientId ? { clientId: payload.clientId } : {}),
          updatedAt: new Date(),
          ...optional.$set,
        },
        $unset: { dueDay: "", ...optional.$unset },
      },
      { new: true }
    ).lean();
  }

  const bill = await BillModel.create({
    userId,
    clientId: payload.clientId,
    name: payload.name,
    amount: payload.amount,
    cycleType: payload.cycleType,
    cycleValue: payload.cycleValue,
    group: payload.group,
    start: payload.start ?? undefined,
    end: payload.end ?? undefined,
    note: payload.note,
    updatedAt: new Date(),
  });

  return bill.toObject();
};

export const getBillByClientId = async (userId: string, clientId: string) => {
  await connectToDatabase();
  return BillModel.findOne({ userId, clientId }).lean();
};

export const toggleBillPaid = async (
  userId: string,
  id: string,
  paid: boolean,
  paidAt: Date | null
) => {
  await connectToDatabase();
  return BillModel.findOneAndUpdate(
    { userId, ...getBillIdentifierQuery(id) },
    paidAt
      ? { $set: { paid, paidAt, updatedAt: new Date() } }
      : {
          $set: { paid, updatedAt: new Date() },
          $unset: { paidAt: "", paidAmount: "", paidNote: "" },
        },
    { new: true }
  ).lean();
};

export const payBill = async (
  userId: string,
  id: string,
  paidAt: Date,
  paidAmount?: number,
  paidNote?: string
) => {
  await connectToDatabase();
  const $set: Record<string, boolean | Date | number | string> = {
    paid: true,
    paidAt,
    updatedAt: new Date(),
  };
  const $unset: Record<string, ""> = {};

  if (paidAmount === undefined) {
    $unset.paidAmount = "";
  } else {
    $set.paidAmount = paidAmount;
  }

  if (!paidNote) {
    $unset.paidNote = "";
  } else {
    $set.paidNote = paidNote;
  }

  return BillModel.findOneAndUpdate(
    { userId, ...getBillIdentifierQuery(id) },
    {
      $set,
      $unset,
    },
    { new: true }
  ).lean();
};

export const unpayBill = async (userId: string, id: string) => {
  await connectToDatabase();
  return BillModel.findOneAndUpdate(
    { userId, ...getBillIdentifierQuery(id) },
    {
      $set: { paid: false, updatedAt: new Date() },
      $unset: { paidAt: "", paidAmount: "", paidNote: "" },
    },
    { new: true }
  ).lean();
};

export const deleteBillById = async (userId: string, id: string) => {
  await connectToDatabase();
  return BillModel.findOneAndDelete({ userId, ...getBillIdentifierQuery(id) }).lean();
};
