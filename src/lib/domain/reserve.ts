import { clampDayInMonth, startOfDay, toYmd } from "@/lib/domain/date";
import type { PayrollWindow } from "@/lib/domain/payroll";

export type BillLike = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  paid: boolean;
  start?: Date | null;
  end?: Date | null;
};

export type ReserveBill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
};

const computeDueDate = (bill: BillLike, window: PayrollWindow) => {
  const base = window.lastPay;
  const year = base.getFullYear();
  const monthIndex = base.getMonth();
  const dueDay = clampDayInMonth(year, monthIndex, bill.dueDay);
  const dueThisMonth = new Date(year, monthIndex, dueDay);

  if (dueThisMonth <= window.lastPay) {
    const nextMonth = new Date(year, monthIndex + 1, 1);
    const nextDay = clampDayInMonth(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      bill.dueDay
    );
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay);
  }

  return dueThisMonth;
};

export const reserveInWindow = (bills: BillLike[], window: PayrollWindow) => {
  const items: ReserveBill[] = [];
  let total = 0;

  bills.forEach((bill) => {
    if (bill.paid) {
      return;
    }

    const dueDate = computeDueDate(bill, window);
    const due = startOfDay(dueDate);

    if (!(window.lastPay < due && due <= window.nextPay)) {
      return;
    }

    if (bill.start && due < startOfDay(bill.start)) {
      return;
    }

    if (bill.end && due > startOfDay(bill.end)) {
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

  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return { total, items };
};
