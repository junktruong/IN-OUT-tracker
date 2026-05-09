import { addDays, clampDayInMonth, startOfDay, startOfWeek, toYmd } from "@/lib/domain/date";
import type { BillCycleType } from "@/lib/domain/bills";

export type BillCycleLike = {
  id: string;
  name: string;
  amount: number;
  cycleType: BillCycleType;
  cycleValue: number;
  paid: boolean;
  paidAt?: Date | null;
  start?: Date | null;
  end?: Date | null;
  createdAt?: Date | null;
};

export type BillPaymentLike = {
  id: string;
  templateId?: string | null;
  templateClientId: string;
  name: string;
  amount: number;
  cycleType: BillCycleType;
  cycleValue: number;
  group?: string;
  start?: Date | null;
  end?: Date | null;
  note?: string;
  dueDate: Date;
  paidAt?: Date | null;
  paidAmount?: number;
  paidNote?: string;
  createdAt?: Date | null;
};

export const isActiveOnDueDate = (bill: Pick<BillCycleLike, "start" | "end">, due: Date) => {
  if (bill.start && due < startOfDay(bill.start)) {
    return false;
  }

  if (bill.end && due > startOfDay(bill.end)) {
    return false;
  }

  return true;
};

const monthlyDueForMonth = (reference: Date, cycleValue: number) => {
  const dueDay = clampDayInMonth(reference.getFullYear(), reference.getMonth(), cycleValue);
  return startOfDay(new Date(reference.getFullYear(), reference.getMonth(), dueDay));
};

const getPreviousScheduledDueDate = (bill: BillCycleLike, reference: Date) => {
  const target = startOfDay(reference);

  if (bill.cycleType === "monthly") {
    const currentMonthDue = monthlyDueForMonth(target, bill.cycleValue);
    if (currentMonthDue <= target) {
      return currentMonthDue;
    }
    return monthlyDueForMonth(new Date(target.getFullYear(), target.getMonth() - 1, 1), bill.cycleValue);
  }

  if (bill.cycleType === "weekly") {
    const targetWeekday = bill.cycleValue % 7;
    let due = target;
    while (due.getDay() !== targetWeekday) {
      due = addDays(due, -1);
    }
    return due;
  }

  const stepDays = Math.max(1, bill.cycleValue);
  const anchor = startOfDay(bill.start ?? bill.createdAt ?? target);
  if (anchor > target) {
    return null;
  }
  const elapsedDays = Math.floor((target.getTime() - anchor.getTime()) / 86400000);
  return addDays(anchor, Math.floor(elapsedDays / stepDays) * stepDays);
};

const getNextScheduledDueDate = (bill: BillCycleLike, reference: Date) => {
  const target = startOfDay(reference);

  if (bill.cycleType === "monthly") {
    const currentMonthDue = monthlyDueForMonth(target, bill.cycleValue);
    if (currentMonthDue > target) {
      return currentMonthDue;
    }
    return monthlyDueForMonth(new Date(target.getFullYear(), target.getMonth() + 1, 1), bill.cycleValue);
  }

  if (bill.cycleType === "weekly") {
    const targetWeekday = bill.cycleValue % 7;
    let due = target;
    while (due.getDay() !== targetWeekday) {
      due = addDays(due, 1);
    }
    if (due <= target) {
      return addDays(due, 7);
    }
    return due;
  }

  const stepDays = Math.max(1, bill.cycleValue);
  const anchor = startOfDay(bill.start ?? bill.createdAt ?? target);
  if (anchor > target) {
    return anchor;
  }
  const elapsedDays = Math.floor((target.getTime() - anchor.getTime()) / 86400000);
  return addDays(anchor, (Math.floor(elapsedDays / stepDays) + 1) * stepDays);
};

export const getPreviousActiveDueDate = (bill: BillCycleLike, reference: Date) => {
  let cursor = reference;
  for (let index = 0; index < 480; index += 1) {
    const candidate = getPreviousScheduledDueDate(bill, cursor);
    if (!candidate) {
      return null;
    }
    if (isActiveOnDueDate(bill, candidate)) {
      return candidate;
    }
    if (bill.start && candidate < startOfDay(bill.start)) {
      return null;
    }
    cursor = addDays(candidate, -1);
  }

  return null;
};

export const getNextActiveDueDate = (bill: BillCycleLike, reference: Date) => {
  let cursor = reference;
  for (let index = 0; index < 480; index += 1) {
    const candidate = getNextScheduledDueDate(bill, cursor);
    if (bill.end && candidate > startOfDay(bill.end)) {
      return null;
    }
    if (isActiveOnDueDate(bill, candidate)) {
      return candidate;
    }
    cursor = candidate;
  }

  return null;
};

export type BillCycleState = {
  currentCyclePaid: boolean;
  currentDueDate?: string;
  displayDueDate?: string;
  nextDueDate?: string;
};

const matchesTemplate = (
  payment: Pick<BillPaymentLike, "templateId" | "templateClientId">,
  bill: Pick<BillCycleLike, "id"> & { clientId?: string; serverId?: string }
) =>
  payment.templateClientId === (bill.clientId ?? bill.id) ||
  (payment.templateId !== undefined &&
    (payment.templateId === bill.serverId || payment.templateId === bill.id));

export const getPaidDueDateSet = (
  bill: Pick<BillCycleLike, "id"> & { clientId?: string; serverId?: string },
  payments: Array<
    Pick<BillPaymentLike, "templateId" | "templateClientId" | "dueDate"> & Record<string, unknown>
  >
) =>
  new Set(
    payments
      .filter((payment) => matchesTemplate(payment, bill))
      .map((payment) => toYmd(startOfDay(payment.dueDate)))
  );

export const getNextUnpaidDueDate = (
  bill: BillCycleLike & { clientId?: string; serverId?: string },
  payments: Array<
    Pick<BillPaymentLike, "templateId" | "templateClientId" | "dueDate"> & Record<string, unknown>
  >,
  reference = new Date()
) => {
  const referenceDay = startOfDay(reference);
  const paidDueDates = getPaidDueDateSet(bill, payments);
  const previousDue = getPreviousActiveDueDate(bill, referenceDay);

  if (previousDue && !paidDueDates.has(toYmd(previousDue))) {
    return previousDue;
  }

  let cursor = previousDue ?? referenceDay;

  for (let index = 0; index < 480; index += 1) {
    const candidate = getNextActiveDueDate(bill, cursor);
    if (!candidate) {
      return null;
    }

    if (!paidDueDates.has(toYmd(candidate))) {
      return candidate;
    }

    cursor = candidate;
  }

  return null;
};

const getCurrentCycleCutoff = (bill: BillCycleLike, reference: Date) => {
  const referenceDay = startOfDay(reference);

  if (bill.cycleType === "monthly") {
    return startOfDay(new Date(referenceDay.getFullYear(), referenceDay.getMonth() + 1, 0));
  }

  if (bill.cycleType === "weekly") {
    return addDays(startOfWeek(referenceDay), 6);
  }

  return getNextActiveDueDate(bill, referenceDay) ?? referenceDay;
};

export const getOpenDueDates = (
  bill: BillCycleLike & { clientId?: string; serverId?: string },
  payments: Array<
    Pick<BillPaymentLike, "templateId" | "templateClientId" | "dueDate"> & Record<string, unknown>
  >,
  reference = new Date()
) => {
  const referenceDay = startOfDay(reference);
  const currentCycleCutoff = getCurrentCycleCutoff(bill, referenceDay);
  const paidDueDates = getPaidDueDateSet(bill, payments);
  const collected = new Map<string, Date>();
  const overdueAnchor = bill.start
    ? startOfDay(bill.start)
    : bill.createdAt
      ? startOfDay(bill.createdAt)
      : null;

  if (overdueAnchor) {
    let backwardCursor = referenceDay;
    for (let index = 0; index < 480; index += 1) {
      const candidate = getPreviousActiveDueDate(bill, backwardCursor);
      if (!candidate || candidate < overdueAnchor) {
        break;
      }

      const key = toYmd(candidate);
      if (!paidDueDates.has(key)) {
        collected.set(key, candidate);
      }

      backwardCursor = addDays(candidate, -1);
    }
  }

  let forwardCursor = referenceDay;
  for (let index = 0; index < 48; index += 1) {
    const candidate = getNextActiveDueDate(bill, forwardCursor);
    if (!candidate || candidate > currentCycleCutoff) {
      break;
    }

    const key = toYmd(candidate);
    if (!paidDueDates.has(key)) {
      collected.set(key, candidate);
    }

    forwardCursor = candidate;
  }

  return [...collected.values()].sort((left, right) => left.getTime() - right.getTime());
};

const resolvePaidDueDate = (bill: BillCycleLike, paidAt: Date) => {
  const previousDue = getPreviousActiveDueDate(bill, paidAt);
  const nextDue = getNextActiveDueDate(bill, paidAt);

  if (!previousDue) {
    return nextDue;
  }

  if (!nextDue) {
    return previousDue;
  }

  const previousDistance = Math.abs(startOfDay(paidAt).getTime() - previousDue.getTime());
  const nextDistance = Math.abs(nextDue.getTime() - startOfDay(paidAt).getTime());

  return previousDistance <= nextDistance ? previousDue : nextDue;
};

export const getNearestActiveDueDate = (bill: BillCycleLike, reference: Date) =>
  resolvePaidDueDate(bill, reference);

export const getBillCycleState = (bill: BillCycleLike, reference = new Date()): BillCycleState => {
  const referenceDay = startOfDay(reference);
  const previousDue = getPreviousActiveDueDate(bill, referenceDay);
  const targetDue = previousDue ?? getNextActiveDueDate(bill, referenceDay);

  if (!targetDue) {
    return {
      currentCyclePaid: false,
    };
  }

  const nextAfterTarget = getNextActiveDueDate(bill, targetDue);
  const paidAt = bill.paid && bill.paidAt ? startOfDay(bill.paidAt) : null;
  const paidDue = paidAt ? getNearestActiveDueDate(bill, paidAt) : null;
  const currentCyclePaid = !!paidDue && paidDue.getTime() === targetDue.getTime();

  return {
    currentCyclePaid,
    currentDueDate: toYmd(targetDue),
    displayDueDate: toYmd(currentCyclePaid ? nextAfterTarget ?? targetDue : targetDue),
    nextDueDate: nextAfterTarget ? toYmd(nextAfterTarget) : undefined,
  };
};
