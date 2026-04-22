import { connectToDatabase } from "@/lib/db/connect";
import { BillModel } from "@/lib/db/models";
import type { BillCycleType } from "@/lib/domain/bills";

export type BillPayload = {
  id?: string;
  name: string;
  amount: number;
  cycleType: BillCycleType;
  cycleValue: number;
  group?: string;
  start?: Date | null;
  end?: Date | null;
  note?: string;
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
      { _id: payload.id, userId },
      {
        $set: {
          name: payload.name,
          amount: payload.amount,
          cycleType: payload.cycleType,
          cycleValue: payload.cycleValue,
          ...optional.$set,
        },
        $unset: { dueDay: "", ...optional.$unset },
      },
      { new: true }
    ).lean();
  }

  const bill = await BillModel.create({
    userId,
    name: payload.name,
    amount: payload.amount,
    cycleType: payload.cycleType,
    cycleValue: payload.cycleValue,
    group: payload.group,
    start: payload.start ?? undefined,
    end: payload.end ?? undefined,
    note: payload.note,
  });

  return bill.toObject();
};

export const toggleBillPaid = async (
  userId: string,
  id: string,
  paid: boolean,
  paidAt: Date | null
) => {
  await connectToDatabase();
  return BillModel.findOneAndUpdate(
    { _id: id, userId },
    paidAt
      ? { $set: { paid, paidAt } }
      : { $set: { paid }, $unset: { paidAt: "", paidAmount: "", paidNote: "" } },
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
    { _id: id, userId },
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
    { _id: id, userId },
    { $set: { paid: false }, $unset: { paidAt: "", paidAmount: "", paidNote: "" } },
    { new: true }
  ).lean();
};

export const deleteBillById = async (userId: string, id: string) => {
  await connectToDatabase();
  return BillModel.findOneAndDelete({ _id: id, userId }).lean();
};
