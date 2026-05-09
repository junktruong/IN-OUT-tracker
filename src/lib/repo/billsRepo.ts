import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/connect";
import { BillModel, BillPaymentModel } from "@/lib/db/models";
import {
  getNearestActiveDueDate,
  getNextUnpaidDueDate,
  getOpenDueDates,
} from "@/lib/domain/billCycle";
import type { BillCycleType } from "@/lib/domain/bills";
import { startOfDay, toYmd } from "@/lib/domain/date";

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

export type BillPaymentPayload = {
  dueDate: Date;
  paidAt: Date;
  paidAmount?: number;
  paidNote?: string;
};

type BillTemplateRecord = {
  _id: unknown;
  clientId?: string | null;
  name: string;
  amount: number;
  cycleType: BillCycleType;
  cycleValue: number;
  group?: string | null;
  start?: Date | null;
  end?: Date | null;
  note?: string | null;
  createdAt?: Date | null;
};

const getBillIdentifierQuery = (id: string) => {
  if (mongoose.isValidObjectId(id)) {
    return { $or: [{ _id: id }, { clientId: id }] };
  }

  return { clientId: id };
};

const toLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getTemplateKey = (template: { _id: unknown; clientId?: string | null }) =>
  template.clientId ?? String(template._id);

const toCycleBill = (template: BillTemplateRecord, reference = new Date()) => ({
  id: String(template._id),
  clientId: getTemplateKey(template),
  serverId: String(template._id),
  name: template.name,
  amount: template.amount,
  cycleType: template.cycleType,
  cycleValue: template.cycleValue,
  paid: false,
  paidAt: null,
  start: template.start,
  end: template.end,
  createdAt: template.createdAt ?? reference,
});

const normalizeOccurrenceDueDate = (template: BillTemplateRecord, dueDate: Date) => {
  const localDueDate = toLocalDay(dueDate);
  const normalizedDueDate = getNearestActiveDueDate(toCycleBill(template, localDueDate), localDueDate);
  return toLocalDay(normalizedDueDate ?? localDueDate);
};

const getTemplateOccurrenceQuery = (
  userId: string,
  template: { _id: unknown; clientId?: string | null }
) => {
  const templateId = String(template._id);
  const templateClientId = getTemplateKey(template);

  if (templateClientId === templateId) {
    return {
      userId,
      $or: [{ templateClientId }, { templateId }],
    };
  }

  return {
    userId,
    $or: [{ templateClientId }, { templateClientId: templateId }, { templateId }],
  };
};

const isPaidOccurrence = (occurrence: { status?: string | null; paidAt?: Date | null }) =>
  occurrence.status === "paid" || Boolean(occurrence.paidAt);

const occurrenceTimestamp = (occurrence: {
  updatedAt?: Date | null;
  paidAt?: Date | null;
  createdAt?: Date | null;
}) =>
  (occurrence.updatedAt ?? occurrence.paidAt ?? occurrence.createdAt ?? new Date(0)).getTime();

const pickCanonicalOccurrence = <
  T extends {
    status?: string | null;
    paidAt?: Date | null;
    updatedAt?: Date | null;
    createdAt?: Date | null;
  },
>(
  left: T,
  right: T
) => {
  const leftPaid = isPaidOccurrence(left);
  const rightPaid = isPaidOccurrence(right);

  if (leftPaid !== rightPaid) {
    return rightPaid ? right : left;
  }

  return occurrenceTimestamp(right) > occurrenceTimestamp(left) ? right : left;
};

const optionalTemplateUnsets = (template: {
  group?: string | null;
  start?: Date | null;
  end?: Date | null;
  note?: string | null;
}) => {
  const $unset: Record<string, ""> = {};

  if (!template.group) {
    $unset.group = "";
  }
  if (!template.start) {
    $unset.start = "";
  }
  if (!template.end) {
    $unset.end = "";
  }
  if (!template.note) {
    $unset.note = "";
  }

  return $unset;
};

const findBillTemplate = async (userId: string, id: string) => {
  await connectToDatabase();
  return BillModel.findOne({ userId, ...getBillIdentifierQuery(id) }).lean();
};

const listTemplatePayments = async (
  userId: string,
  template: { _id: unknown; clientId?: string | null }
) => {
  await connectToDatabase();
  return BillPaymentModel.find(getTemplateOccurrenceQuery(userId, template))
    .sort({ dueDate: -1, paidAt: -1 })
    .lean();
};

const syncTemplateOccurrences = async (
  userId: string,
  template: BillTemplateRecord,
  reference = new Date()
) => {
  await connectToDatabase();

  const cycleBill = toCycleBill(template, reference);
  const templateClientId = getTemplateKey(template);
  const occurrenceQuery = getTemplateOccurrenceQuery(userId, template);
  const baseSetWithoutTemplateClientId = {
    templateId: String(template._id),
    name: template.name,
    amount: template.amount,
    cycleType: template.cycleType,
    cycleValue: template.cycleValue,
    group: template.group,
    start: template.start,
    end: template.end,
    note: template.note,
    updatedAt: new Date(),
  };
  const baseSet = {
    ...baseSetWithoutTemplateClientId,
    templateClientId,
  };

  const existingOccurrences = await BillPaymentModel.find(occurrenceQuery).lean();
  const normalizedExistingOccurrences = existingOccurrences.map((occurrence) => {
    const canonicalDueDate = normalizeOccurrenceDueDate(template, occurrence.dueDate);
    return {
      occurrence,
      canonicalDueDate,
      canonicalKey: toYmd(canonicalDueDate),
    };
  });
  const byDueDate = new Map<string, typeof normalizedExistingOccurrences>();

  normalizedExistingOccurrences.forEach((entry) => {
    byDueDate.set(entry.canonicalKey, [...(byDueDate.get(entry.canonicalKey) ?? []), entry]);
  });

  const canonicalOccurrences = [...byDueDate.values()].map((group) => {
    const winner = group
      .map((entry) => entry.occurrence)
      .reduce((left, right) => pickCanonicalOccurrence(left, right));
    const winnerEntry = group.find(
      (entry) => String(entry.occurrence._id) === String(winner._id)
    );

    return {
      occurrence: winner,
      dueDate: winnerEntry?.canonicalDueDate ?? normalizeOccurrenceDueDate(template, winner.dueDate),
    };
  });
  const canonicalIds = new Set(
    canonicalOccurrences.map(({ occurrence }) => String(occurrence._id))
  );
  const duplicateIds = normalizedExistingOccurrences
    .filter(({ occurrence }) => !canonicalIds.has(String(occurrence._id)))
    .map(({ occurrence }) => occurrence._id);

  if (duplicateIds.length > 0) {
    await BillPaymentModel.deleteMany({ _id: { $in: duplicateIds } });
  }

  await Promise.all(
    canonicalOccurrences.map(({ occurrence, dueDate }) => {
      const status = isPaidOccurrence(occurrence) ? "paid" : "unpaid";
      return BillPaymentModel.updateOne(
        { _id: occurrence._id },
        {
          $set: {
            ...baseSet,
            dueDate,
            status,
          },
          $unset: {
            ...optionalTemplateUnsets(template),
            ...(status === "paid" ? {} : { paidAt: "", paidAmount: "", paidNote: "" }),
          },
        }
      );
    })
  );

  const normalizedOccurrences = await BillPaymentModel.find({
    userId,
    templateClientId,
  }).lean();
  const paidOccurrences = normalizedOccurrences.filter((occurrence) =>
    isPaidOccurrence(occurrence)
  );

  const openDueDates = getOpenDueDates(
    cycleBill,
    paidOccurrences.map((occurrence) => ({
      id: String(occurrence._id),
      templateId: occurrence.templateId,
      templateClientId: occurrence.templateClientId,
      dueDate: occurrence.dueDate,
      paidAt: occurrence.paidAt ?? undefined,
    })),
    reference
  );
  const openDueDateKeys = new Set(openDueDates.map((dueDate) => toYmd(startOfDay(dueDate))));

  const staleUnpaidIds = normalizedOccurrences
    .filter((occurrence) => !isPaidOccurrence(occurrence))
    .filter((occurrence) => !openDueDateKeys.has(toYmd(startOfDay(occurrence.dueDate))))
    .map((occurrence) => occurrence._id);

  if (staleUnpaidIds.length > 0) {
    await BillPaymentModel.deleteMany({
      _id: { $in: staleUnpaidIds },
    });
  }

  if (openDueDates.length === 0) {
    return;
  }

  await BillPaymentModel.bulkWrite(
    openDueDates.map((dueDate) => ({
      updateOne: {
        filter: {
          userId,
          templateClientId,
          dueDate: toLocalDay(dueDate),
        },
        update: {
          $setOnInsert: {
            createdAt: new Date(),
          },
          $set: {
            ...baseSetWithoutTemplateClientId,
            status: "unpaid",
          },
          $unset: {
            paidAt: "",
            paidAmount: "",
            paidNote: "",
            ...optionalTemplateUnsets(template),
          },
        },
        upsert: true,
      },
    }))
  );
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
    const updated = await BillModel.findOneAndUpdate(
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
    if (updated) {
      await syncTemplateOccurrences(userId, updated);
    }
    return updated;
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
  const created = bill.toObject();
  await syncTemplateOccurrences(userId, created);
  return created;
};

export const getBillByClientId = async (userId: string, clientId: string) => {
  await connectToDatabase();
  return BillModel.findOne({ userId, clientId }).lean();
};

export const listBillPayments = async (userId: string) => {
  await connectToDatabase();
  const templates = await BillModel.find({ userId }).lean();
  await Promise.all(templates.map((template) => syncTemplateOccurrences(userId, template)));
  return BillPaymentModel.find({ userId }).sort({ dueDate: -1, paidAt: -1 }).lean();
};

export const resolveLegacyPayDueDate = async (userId: string, id: string, paidAt: Date) => {
  const template = await findBillTemplate(userId, id);
  if (!template) {
    return null;
  }

  const payments = (await listTemplatePayments(userId, template)).filter(
    (payment): payment is typeof payment & { paidAt: Date } =>
      isPaidOccurrence(payment) && Boolean(payment.paidAt)
  );
  return getNextUnpaidDueDate(
    toCycleBill(template, paidAt),
    payments.map((payment) => ({
      id: String(payment._id),
      templateId: payment.templateId,
      templateClientId: payment.templateClientId,
      dueDate: payment.dueDate,
    })),
    paidAt
  );
};

export const resolveLegacyUnpayDueDate = async (
  userId: string,
  id: string,
  paidAt?: Date | null
) => {
  const template = await findBillTemplate(userId, id);
  if (!template) {
    return null;
  }

  const payments = (await listTemplatePayments(userId, template)).filter(
    (payment): payment is typeof payment & { paidAt: Date } =>
      isPaidOccurrence(payment) && Boolean(payment.paidAt)
  );
  if (payments.length === 0) {
    return null;
  }

  if (!paidAt) {
    return payments[0]?.dueDate ?? null;
  }

  const paidDay = startOfDay(paidAt).getTime();
  const exactMatch = payments.find((payment) => startOfDay(payment.paidAt).getTime() === paidDay);
  if (exactMatch) {
    return exactMatch.dueDate;
  }

  return payments.reduce((closest, payment) => {
    const currentDistance = Math.abs(startOfDay(payment.paidAt).getTime() - paidDay);
    if (!closest) {
      return payment;
    }
    const closestDistance = Math.abs(startOfDay(closest.paidAt).getTime() - paidDay);
    return currentDistance < closestDistance ? payment : closest;
  }, payments[0]).dueDate;
};

export const toggleBillPaid = async (
  userId: string,
  id: string,
  paid: boolean,
  paidAt: Date | null
) => {
  if (paid && paidAt) {
    return payBill(userId, id, {
      dueDate: paidAt,
      paidAt,
    });
  }

  return null;
};

export const payBill = async (
  userId: string,
  id: string,
  payload: BillPaymentPayload
) => {
  await connectToDatabase();
  const template = await BillModel.findOne({ userId, ...getBillIdentifierQuery(id) }).lean();
  if (!template) {
    return null;
  }

  const dueDate = normalizeOccurrenceDueDate(template, payload.dueDate);
  await syncTemplateOccurrences(userId, template, dueDate);
  const paidAt = toLocalDay(payload.paidAt);

  const payment = await BillPaymentModel.findOneAndUpdate(
    {
      ...getTemplateOccurrenceQuery(userId, template),
      dueDate,
    },
    {
      $setOnInsert: {
        userId,
        dueDate,
        createdAt: new Date(),
      },
      $set: {
        templateId: String(template._id),
        templateClientId: getTemplateKey(template),
        name: template.name,
        amount: template.amount,
        cycleType: template.cycleType,
        cycleValue: template.cycleValue,
        group: template.group,
        start: template.start,
        end: template.end,
        note: template.note,
        status: "paid",
        paidAt,
        paidAmount: payload.paidAmount,
        paidNote: payload.paidNote,
        updatedAt: new Date(),
      },
      $unset: {
        ...(template.group ? {} : { group: "" }),
        ...(template.start ? {} : { start: "" }),
        ...(template.end ? {} : { end: "" }),
        ...(template.note ? {} : { note: "" }),
      },
    },
    { upsert: true, new: true }
  ).lean();

  return payment;
};

export const unpayBill = async (userId: string, id: string, dueDate: Date) => {
  await connectToDatabase();
  const template = await BillModel.findOne({ userId, ...getBillIdentifierQuery(id) }).lean();
  if (!template) {
    return null;
  }

  const canonicalDueDate = normalizeOccurrenceDueDate(template, dueDate);
  await syncTemplateOccurrences(userId, template, canonicalDueDate);

  return BillPaymentModel.findOneAndUpdate(
    {
      ...getTemplateOccurrenceQuery(userId, template),
      dueDate: canonicalDueDate,
    },
    {
      $set: {
        status: "unpaid",
        dueDate: canonicalDueDate,
        updatedAt: new Date(),
      },
      $unset: {
        paidAt: "",
        paidAmount: "",
        paidNote: "",
      },
    },
    { new: true }
  ).lean();
};

export const deleteBillById = async (userId: string, id: string) => {
  await connectToDatabase();
  const removed = await BillModel.findOneAndDelete({ userId, ...getBillIdentifierQuery(id) }).lean();
  if (removed) {
    await BillPaymentModel.deleteMany(getTemplateOccurrenceQuery(userId, removed));
  }
  return removed;
};
