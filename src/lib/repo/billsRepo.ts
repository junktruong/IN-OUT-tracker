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

export const listBills = async () => {
  await connectToDatabase();
  return BillModel.find().sort({ dueDay: 1 }).lean();
};

export const upsertBill = async (payload: BillPayload) => {
  await connectToDatabase();
  if (payload.id) {
    return BillModel.findByIdAndUpdate(
      payload.id,
      {
        name: payload.name,
        amount: payload.amount,
        dueDay: payload.dueDay,
        group: payload.group,
        start: payload.start ?? undefined,
        end: payload.end ?? undefined,
        note: payload.note,
      },
      { new: true, upsert: true }
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
    { paid, paidAt: paidAt ?? undefined },
    { new: true }
  ).lean();
};
