import { addDays, clampDayInMonth, startOfDay, toYmd } from "@/lib/domain/date";
import type { PayrollWindow } from "@/lib/domain/payroll";
import type { BillCycleType } from "@/lib/domain/bills";
import { getNextActiveDueDate, getOpenDueDates, isActiveOnDueDate } from "@/lib/domain/billCycle";

export type BillLike = {
  id: string;
  clientId?: string;
  serverId?: string;
  name: string;
  amount: number;
  cycleType: BillCycleType;
  cycleValue: number;
  paid: boolean;
  paidAt?: Date | null;
  paidDueDates?: string[];
  start?: Date | null;
  end?: Date | null;
  createdAt?: Date | null;
};

export type ReserveBill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "paid" | "unpaid";
  paidAt?: string;
  nextDueDate?: string;
};

export type ReserveSummary = {
  total: number;
  totalPlanned: number;
  totalPaid: number;
  items: ReserveBill[];
};

const isInPayrollWindow = (date: Date, window: PayrollWindow) =>
  window.lastPay < date && date <= window.nextPay;

const computeMonthlyDueDates = (bill: BillLike, window: PayrollWindow) => {
  const dates: Date[] = [];
  const cursor = new Date(window.lastPay.getFullYear(), window.lastPay.getMonth(), 1);
  const end = new Date(window.nextPay.getFullYear(), window.nextPay.getMonth(), 1);

  while (cursor <= end) {
    const dueDay = clampDayInMonth(cursor.getFullYear(), cursor.getMonth(), bill.cycleValue);
    const due = startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), dueDay));
    if (isInPayrollWindow(due, window)) {
      dates.push(due);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return dates;
};

const computeWeeklyDueDates = (bill: BillLike, window: PayrollWindow) => {
  const dates: Date[] = [];
  const targetWeekday = bill.cycleValue % 7;
  let due = addDays(startOfDay(window.lastPay), 1);

  while (due.getDay() !== targetWeekday) {
    due = addDays(due, 1);
  }

  while (due <= window.nextPay) {
    dates.push(due);
    due = addDays(due, 7);
  }

  return dates;
};

const computeCustomDueDates = (bill: BillLike, window: PayrollWindow) => {
  const dates: Date[] = [];
  const stepDays = Math.max(1, bill.cycleValue);
  const anchor = startOfDay(bill.start ?? bill.createdAt ?? window.lastPay);
  let due = anchor;

  if (due <= window.lastPay) {
    const elapsedDays = Math.floor(
      (startOfDay(window.lastPay).getTime() - anchor.getTime()) / 86400000
    );
    due = addDays(anchor, (Math.floor(elapsedDays / stepDays) + 1) * stepDays);
  }

  while (due <= window.nextPay) {
    dates.push(due);
    due = addDays(due, stepDays);
  }

  return dates;
};

const computeDueDates = (bill: BillLike, window: PayrollWindow) => {
  if (bill.cycleType === "weekly") {
    return computeWeeklyDueDates(bill, window);
  }

  if (bill.cycleType === "custom_days") {
    return computeCustomDueDates(bill, window);
  }

  return computeMonthlyDueDates(bill, window);
};

const resolvePaidOccurrenceIndex = (bill: BillLike, dueDates: Date[], window: PayrollWindow) => {
  if (!bill.paid || !bill.paidAt || dueDates.length === 0) {
    return -1;
  }

  const paidAt = startOfDay(bill.paidAt);
  if (paidAt <= window.lastPay || paidAt > window.nextPay) {
    return -1;
  }

  let occurrenceIndex = -1;

  dueDates.forEach((dueDate, index) => {
    if (dueDate <= paidAt) {
      occurrenceIndex = index;
    }
  });

  return occurrenceIndex === -1 ? 0 : occurrenceIndex;
};

export const reserveInWindow = (
  bills: BillLike[],
  window: PayrollWindow,
  reference = new Date()
): ReserveSummary => {
  const items: ReserveBill[] = [];
  let total = 0;
  let totalPlanned = 0;
  let totalPaid = 0;

  bills.forEach((bill) => {
    const paidDueDateSet = new Set(bill.paidDueDates ?? []);
    const overdueDueDates = getOpenDueDates(
      bill,
      (bill.paidDueDates ?? []).map((dueDate, index) => ({
        id: `${bill.id}:${dueDate}:${index}`,
        templateClientId: bill.clientId ?? bill.id,
        templateId: bill.serverId,
        dueDate: new Date(`${dueDate}T00:00:00`),
      })),
      reference
    ).filter((dueDate) => dueDate < window.lastPay);

    const dueDates = [...overdueDueDates, ...computeDueDates(bill, window)]
      .map((dueDate) => startOfDay(dueDate))
      .filter((dueDate) => isActiveOnDueDate(bill, dueDate))
      .filter(
        (dueDate, index, list) =>
          list.findIndex((item) => item.getTime() === dueDate.getTime()) === index
      )
      .sort((left, right) => left.getTime() - right.getTime());
    const fallbackPaidOccurrenceIndex =
      paidDueDateSet.size === 0 ? resolvePaidOccurrenceIndex(bill, dueDates, window) : -1;

    const hasLaterUnpaidOccurrence = (fromIndex: number) =>
      dueDates.some((dueDate, index) => index > fromIndex && !paidDueDateSet.has(toYmd(dueDate)));

    dueDates.forEach((due, index) => {
      const status =
        paidDueDateSet.size > 0
          ? paidDueDateSet.has(toYmd(due))
          ? "paid"
          : "unpaid"
          : index === fallbackPaidOccurrenceIndex
            ? "paid"
            : "unpaid";
      totalPlanned += bill.amount;
      if (status === "paid") {
        totalPaid += bill.amount;
      } else {
        total += bill.amount;
      }

      const nextDueDate =
        status === "paid" && !hasLaterUnpaidOccurrence(index)
          ? getNextActiveDueDate(bill, due)
          : null;
      items.push({
        id: bill.id,
        name: bill.name,
        amount: bill.amount,
        dueDate: toYmd(due),
        status,
        paidAt: status === "paid" && bill.paidAt ? toYmd(startOfDay(bill.paidAt)) : undefined,
        nextDueDate: nextDueDate ? toYmd(nextDueDate) : undefined,
      });
    });
  });

  items.sort((a, b) => {
    const dueCompare = a.dueDate.localeCompare(b.dueDate);
    if (dueCompare !== 0) {
      return dueCompare;
    }
    return a.status.localeCompare(b.status);
  });

  return { total, totalPlanned, totalPaid, items };
};
