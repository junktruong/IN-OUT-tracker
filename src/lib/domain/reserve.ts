import { addDays, clampDayInMonth, startOfDay, toYmd } from "@/lib/domain/date";
import type { PayrollWindow } from "@/lib/domain/payroll";
import type { BillCycleType } from "@/lib/domain/bills";

export type BillLike = {
  id: string;
  name: string;
  amount: number;
  cycleType: BillCycleType;
  cycleValue: number;
  paid: boolean;
  start?: Date | null;
  end?: Date | null;
  createdAt?: Date | null;
};

export type ReserveBill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
};

const isInPayrollWindow = (date: Date, window: PayrollWindow) =>
  window.lastPay < date && date <= window.nextPay;

const isActiveOnDueDate = (bill: BillLike, due: Date) => {
  if (bill.start && due < startOfDay(bill.start)) {
    return false;
  }

  if (bill.end && due > startOfDay(bill.end)) {
    return false;
  }

  return true;
};

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

export const reserveInWindow = (bills: BillLike[], window: PayrollWindow) => {
  const items: ReserveBill[] = [];
  let total = 0;

  bills.forEach((bill) => {
    if (bill.paid) {
      return;
    }

    computeDueDates(bill, window).forEach((dueDate) => {
      const due = startOfDay(dueDate);

      if (!isActiveOnDueDate(bill, due)) {
        return;
      }

      total += bill.amount;
      items.push({
        id: bill.id,
        name: bill.name,
        amount: bill.amount,
        dueDate: toYmd(due),
      });
    });
  });

  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return { total, items };
};
