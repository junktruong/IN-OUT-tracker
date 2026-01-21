import { clampDayInMonth, startOfDay } from "@/lib/domain/date";

type PayrollWindow = {
  lastPay: Date;
  nextPay: Date;
};

export const payrollWindow = (today: Date, paydayDay: number): PayrollWindow => {
  const current = startOfDay(today);
  const year = current.getFullYear();
  const monthIndex = current.getMonth();
  const clampedDay = clampDayInMonth(year, monthIndex, paydayDay);
  const thisMonthPay = new Date(year, monthIndex, clampedDay);

  let lastPay = thisMonthPay;
  let nextPay = thisMonthPay;

  if (thisMonthPay > current) {
    const prevMonth = new Date(year, monthIndex - 1, 1);
    const prevDay = clampDayInMonth(
      prevMonth.getFullYear(),
      prevMonth.getMonth(),
      paydayDay
    );
    lastPay = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevDay);
    nextPay = thisMonthPay;
  } else {
    const nextMonth = new Date(year, monthIndex + 1, 1);
    const nextDay = clampDayInMonth(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      paydayDay
    );
    lastPay = thisMonthPay;
    nextPay = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay);
  }

  return { lastPay, nextPay };
};

export type { PayrollWindow };
