import { connectToDatabase } from "@/lib/db/connect";
import { BillModel } from "@/lib/db/models";

export type BillPayload = {
  id?: string;
  name: string;
  amount: number;
  dueDay: number;
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

export const listBills = async () => {
  await connectToDatabase();
  return BillModel.find().sort({ dueDay: 1 }).lean();
};

export const upsertBill = async (payload: BillPayload) => {
  await connectToDatabase();
  if (payload.id) {
    const optional = optionalBillFields(payload);
    return BillModel.findByIdAndUpdate(
      payload.id,
      {
        $set: {
          name: payload.name,
          amount: payload.amount,
          dueDay: payload.dueDay,
          ...optional.$set,
        },
        $unset: optional.$unset,
      },
      { new: true }
    ).lean();
  }

  const bill = await BillModel.create({
    name: payload.name,
    amount: payload.amount,
    dueDay: payload.dueDay,
    group: payload.group,
    start: payload.start ?? undefined,
    end: payload.end ?? undefined,
    note: payload.note,
  });

  return bill.toObject();
};

export const toggleBillPaid = async (id: string, paid: boolean, paidAt: Date | null) => {
  await connectToDatabase();
  return BillModel.findByIdAndUpdate(
    id,
    paidAt
      ? { $set: { paid, paidAt } }
      : { $set: { paid }, $unset: { paidAt: "", paidAmount: "", paidNote: "" } },
    { new: true }
  ).lean();
};

export const payBill = async (
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

  return BillModel.findByIdAndUpdate(
    id,
    {
      $set,
      $unset,
    },
    { new: true }
  ).lean();
};

export const unpayBill = async (id: string) => {
  await connectToDatabase();
  return BillModel.findByIdAndUpdate(
    id,
    { $set: { paid: false }, $unset: { paidAt: "", paidAmount: "", paidNote: "" } },
    { new: true }
  ).lean();
};

export const deleteBillById = async (id: string) => {
  await connectToDatabase();
  return BillModel.findByIdAndDelete(id).lean();
};
